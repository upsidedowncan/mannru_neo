import fs from 'fs/promises';
import path from 'path';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  balance: number;
  fullName: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  senderId: string;
  receiverId: string | null;
  amount: number;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'payment';
  status: 'completed' | 'pending' | 'failed';
  timestamp: string;
  description: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'transfer_received' | 'transfer_sent' | 'deposit' | 'withdrawal';
  title: string;
  message: string;
  amount?: number;
  read: boolean;
  timestamp: string;
}

export type CardTier = 'standard' | 'gold' | 'platinum' | 'black';

export interface Card {
  id: string;
  userId: string;
  tier: CardTier;
  lastFour: string;
  balance: number;
  createdAt: string;
  isActive: boolean;
}

export interface WireTransfer {
  id: string;
  userId: string;
  fromCardId: string;
  toCardId: string;
  amount: number;
  transferred: number;
  status: 'active' | 'paused' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface EmojiTransfer {
  id: string;
  userId: string;
  code: string;
  amount: number;
  senderUsername: string;
  isUsed: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface DBData {
  users: User[];
  transactions: Transaction[];
  notifications: Notification[];
  cards: Card[];
  wireTransfers: WireTransfer[];
  emojiTransfers: EmojiTransfer[];
}

const DB_FILE = path.join(process.cwd(), 'database.json');

let memoryCache: DBData | null = null;

export async function readDB(): Promise<DBData> {
  if (memoryCache) return memoryCache;

  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    memoryCache = JSON.parse(data);
    return memoryCache as DBData;
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      const defaultData: DBData = {
        users: [],
        transactions: [],
        notifications: [],
        cards: [],
        wireTransfers: [],
        emojiTransfers: [],
      };
      await fs.writeFile(DB_FILE, JSON.stringify(defaultData, null, 2));
      memoryCache = defaultData;
      return defaultData;
    }
    throw e;
  }
}

export async function writeDB(data: DBData): Promise<void> {
  memoryCache = data;
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

export async function getUser(id: string): Promise<User | undefined> {
  const db = await readDB();
  return db.users.find((u) => u.id === id);
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const db = await readDB();
  return db.users.find((u) => u.username === username);
}

export async function getTransactions(userId: string): Promise<Transaction[]> {
  const db = await readDB();
  return db.transactions
    .filter((t) => t.senderId === userId || t.receiverId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  const db = await readDB();
  return db.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function createNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<Notification> {
  const db = await readDB();
  const newNotification: Notification = {
    ...notification,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    read: false,
  };
  db.notifications.push(newNotification);
  await writeDB(db);
  return newNotification;
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const db = await readDB();
  const notification = db.notifications.find((n) => n.id === notificationId);
  if (notification) {
    notification.read = true;
    await writeDB(db);
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const db = await readDB();
  return db.notifications.filter((n) => n.userId === userId && !n.read).length;
}

export async function getCards(userId: string): Promise<Card[]> {
  const db = await readDB();
  return db.cards.filter((c) => c.userId === userId && c.isActive);
}

export async function createCard(userId: string, tier: CardTier): Promise<Card> {
  const db = await readDB();
  const lastFour = Math.floor(1000 + Math.random() * 9000).toString();
  
  const newCard: Card = {
    id: crypto.randomUUID(),
    userId,
    tier,
    lastFour,
    balance: 0,
    createdAt: new Date().toISOString(),
    isActive: true,
  };
  
  db.cards.push(newCard);
  await writeDB(db);
  return newCard;
}

export async function updateCardBalance(cardId: string, amount: number, operation: 'add' | 'subtract'): Promise<Card | null> {
  const db = await readDB();
  const cardIndex = db.cards.findIndex((c) => c.id === cardId);
  
  if (cardIndex === -1) return null;
  
  if (operation === 'add') {
    db.cards[cardIndex].balance += amount;
  } else {
    if (db.cards[cardIndex].balance < amount) return null;
    db.cards[cardIndex].balance -= amount;
  }
  
  await writeDB(db);
  return db.cards[cardIndex];
}

export async function deleteCard(cardId: string, userId: string): Promise<boolean> {
  const db = await readDB();
  const cardIndex = db.cards.findIndex((c) => c.id === cardId && c.userId === userId);
  
  if (cardIndex === -1) return false;
  
  db.cards[cardIndex].isActive = false;
  await writeDB(db);
  return true;
}

export async function updateUserBalance(userId: string, amount: number, operation: 'add' | 'subtract'): Promise<User | null> {
  const db = await readDB();
  const userIndex = db.users.findIndex((u) => u.id === userId);
  
  if (userIndex === -1) return null;
  
  if (operation === 'add') {
    db.users[userIndex].balance += amount;
  } else {
    if (db.users[userIndex].balance < amount) return null;
    db.users[userIndex].balance -= amount;
  }
  
  await writeDB(db);
  return db.users[userIndex];
}

// Wire Transfer Functions
export async function getWireTransfers(userId: string): Promise<WireTransfer[]> {
  const db = await readDB();
  return db.wireTransfers.filter((w) => w.userId === userId);
}

export async function createWireTransfer(userId: string, fromCardId: string, toCardId: string, amount: number): Promise<WireTransfer> {
  const db = await readDB();
  
  const wireTransfer: WireTransfer = {
    id: crypto.randomUUID(),
    userId,
    fromCardId,
    toCardId,
    amount,
    transferred: 0,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  db.wireTransfers.push(wireTransfer);
  await writeDB(db);
  return wireTransfer;
}

export async function executeWireTransfer(wireId: string): Promise<WireTransfer | null> {
  const db = await readDB();
  const wireIndex = db.wireTransfers.findIndex((w) => w.id === wireId);
  
  if (wireIndex === -1) return null;
  const wire = db.wireTransfers[wireIndex];
  
  if (wire.status !== 'active') return wire;
  
  const fromCard = db.cards.find((c) => c.id === wire.fromCardId && c.userId === wire.userId);
  const toCard = db.cards.find((c) => c.id === wire.toCardId && c.userId === wire.userId);
  
  if (!fromCard || !toCard) {
    db.wireTransfers[wireIndex].status = 'failed';
    db.wireTransfers[wireIndex].updatedAt = new Date().toISOString();
    await writeDB(db);
    return db.wireTransfers[wireIndex];
  }
  
  // Calculate remaining amount to transfer
  const remaining = wire.amount - wire.transferred;
  
  if (remaining <= 0) {
    db.wireTransfers[wireIndex].status = 'completed';
    db.wireTransfers[wireIndex].updatedAt = new Date().toISOString();
    await writeDB(db);
    return db.wireTransfers[wireIndex];
  }
  
  // Transfer 10% of remaining amount per execution
  const transferAmount = Math.min(remaining, Math.max(100, Math.floor(remaining * 0.1)));
  
  if (fromCard.balance < transferAmount) {
    db.wireTransfers[wireIndex].status = 'failed';
    db.wireTransfers[wireIndex].updatedAt = new Date().toISOString();
    await writeDB(db);
    return db.wireTransfers[wireIndex];
  }
  
  const fromCardIndex = db.cards.findIndex((c) => c.id === wire.fromCardId);
  const toCardIndex = db.cards.findIndex((c) => c.id === wire.toCardId);
  
  db.cards[fromCardIndex].balance -= transferAmount;
  db.cards[toCardIndex].balance += transferAmount;
  db.wireTransfers[wireIndex].transferred += transferAmount;
  db.wireTransfers[wireIndex].updatedAt = new Date().toISOString();
  
  // Mark as completed if all amount transferred
  if (db.wireTransfers[wireIndex].transferred >= wire.amount) {
    db.wireTransfers[wireIndex].status = 'completed';
  }
  
  await writeDB(db);
  return db.wireTransfers[wireIndex];
}

export async function pauseWireTransfer(wireId: string, userId: string): Promise<boolean> {
  const db = await readDB();
  const wireIndex = db.wireTransfers.findIndex((w) => w.id === wireId && w.userId === userId);
  
  if (wireIndex === -1) return false;
  
  db.wireTransfers[wireIndex].status = 'paused';
  db.wireTransfers[wireIndex].updatedAt = new Date().toISOString();
  await writeDB(db);
  return true;
}

export async function resumeWireTransfer(wireId: string, userId: string): Promise<boolean> {
  const db = await readDB();
  const wireIndex = db.wireTransfers.findIndex((w) => w.id === wireId && w.userId === userId);
  
  if (wireIndex === -1) return false;
  
  db.wireTransfers[wireIndex].status = 'active';
  db.wireTransfers[wireIndex].updatedAt = new Date().toISOString();
  await writeDB(db);
  return true;
}

export async function deleteWireTransfer(wireId: string, userId: string): Promise<boolean> {
  const db = await readDB();
  const wireIndex = db.wireTransfers.findIndex((w) => w.id === wireId && w.userId === userId);
  
  if (wireIndex === -1) return false;
  
  db.wireTransfers.splice(wireIndex, 1);
  await writeDB(db);
  return true;
}

// Emoji Transfer Functions
export async function createEmojiTransfer(userId: string, code: string, amount: number, senderUsername: string): Promise<EmojiTransfer> {
  const db = await readDB();
  
  const emojiTransfer: EmojiTransfer = {
    id: crypto.randomUUID(),
    userId,
    code,
    amount,
    senderUsername,
    isUsed: false,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
    createdAt: new Date().toISOString(),
  };
  
  db.emojiTransfers.push(emojiTransfer);
  await writeDB(db);
  return emojiTransfer;
}

export async function getEmojiTransfer(code: string): Promise<EmojiTransfer | null> {
  const db = await readDB();
  const transfer = db.emojiTransfers.find((t) => t.code === code && !t.isUsed);
  
  if (!transfer) return null;
  
  // Check if expired
  if (new Date(transfer.expiresAt) < new Date()) {
    return null;
  }
  
  return transfer;
}

export async function useEmojiTransfer(code: string): Promise<boolean> {
  const db = await readDB();
  const transferIndex = db.emojiTransfers.findIndex((t) => t.code === code && !t.isUsed);
  
  if (transferIndex === -1) return false;
  
  // Check if expired
  if (new Date(db.emojiTransfers[transferIndex].expiresAt) < new Date()) {
    return false;
  }
  
  db.emojiTransfers[transferIndex].isUsed = true;
  await writeDB(db);
  return true;
}

export async function getUserEmojiTransfers(userId: string): Promise<EmojiTransfer[]> {
  const db = await readDB();
  return db.emojiTransfers.filter((t) => t.userId === userId);
}
