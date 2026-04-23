'use server';

import { redirect } from 'next/navigation';
import { hash, compare } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { readDB, writeDB, getUserByUsername, User, Transaction, createNotification, createCard } from './db';
import { setSession, clearSession, getSession } from './auth';

export async function loginAction(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Пожалуйста, заполните все поля.' };
  }

  const user = await getUserByUsername(username);
  if (!user) {
    return { error: 'Неверное имя пользователя или пароль.' };
  }

  const isValid = await compare(password, user.passwordHash);
  if (!isValid) {
    return { error: 'Неверное имя пользователя или пароль.' };
  }

  await setSession(user.id);
  redirect('/');
}

export async function registerAction(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;

  if (!username || !password || !fullName) {
    return { error: 'Пожалуйста, заполните все поля.' };
  }

  if (password.length < 6) {
    return { error: 'Пароль должен быть не менее 6 символов.' };
  }

  const db = await readDB();
  const existingUser = db.users.find((u) => u.username === username);
  
  if (existingUser) {
    return { error: 'Пользователь с таким именем уже существует.' };
  }

  const passwordHash = await hash(password, 10);
  
  const newUser: User = {
    id: randomUUID(),
    username,
    fullName,
    passwordHash,
    balance: 10000, // Starting bonus
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  
  // Create an initial deposit transaction
  const initialTransaction: Transaction = {
    id: randomUUID(),
    senderId: 'system',
    receiverId: newUser.id,
    amount: 10000,
    type: 'deposit',
    status: 'completed',
    timestamp: new Date().toISOString(),
    description: 'Приветственный бонус Mannru',
  };
  
  db.transactions.push(initialTransaction);
  
  // Create starter card with 10,000 МР
  const starterCard = await createCard(newUser.id, 'standard');
  const cardIndex = db.cards.findIndex((c) => c.id === starterCard.id);
  if (cardIndex !== -1) {
    db.cards[cardIndex].balance = 10000;
  }
  
  await writeDB(db);

  await setSession(newUser.id);
  redirect('/');
}

export async function logoutAction() {
  await clearSession();
  redirect('/login');
}

export async function transferActionWrapper(formData: FormData) {
  const session = await getSession();
  if (!session?.userId) return { error: 'Not authenticated' };
  return transferAction(formData, session.userId);
}

export async function transferAction(formData: FormData, senderId: string) {
  const recipientUsername = formData.get('recipientUsername') as string;
  const amountStr = formData.get('amount') as string;
  const description = formData.get('description') as string || 'Перевод средств';

  const amount = parseFloat(amountStr);

  if (!recipientUsername || !amount || amount <= 0) {
    return { error: 'Заполните все поля корректно.' };
  }

  const db = await readDB();
  
  const senderIndex = db.users.findIndex((u) => u.id === senderId);
  if (senderIndex === -1) return { error: 'Отправитель не найден.' };
  const sender = db.users[senderIndex];

  if (sender.username === recipientUsername) {
    return { error: 'Нельзя перевести средства самому себе.' };
  }

  const recipientIndex = db.users.findIndex((u) => u.username === recipientUsername);
  if (recipientIndex === -1) {
    return { error: 'Получатель не найден.' };
  }
  const recipient = db.users[recipientIndex];

  if (sender.balance < amount) {
    return { error: 'Недостаточно средств.' };
  }

  // Deduct from sender
  db.users[senderIndex].balance -= amount;
  // Add to recipient
  db.users[recipientIndex].balance += amount;

  const transaction: Transaction = {
    id: randomUUID(),
    senderId: sender.id,
    receiverId: recipient.id,
    amount,
    type: 'transfer',
    status: 'completed',
    timestamp: new Date().toISOString(),
    description,
  };

  db.transactions.push(transaction);
  await writeDB(db);

  // Create notifications
  await createNotification({
    userId: sender.id,
    type: 'transfer_sent',
    title: 'Перевод отправлен',
    message: `Вы отправили ${amount} МР пользователю @${recipient.username}`,
    amount,
  });

  await createNotification({
    userId: recipient.id,
    type: 'transfer_received',
    title: 'Перевод получен',
    message: `Вы получили ${amount} МР от пользователя @${sender.username}`,
    amount,
  });

  redirect('/history');
}
