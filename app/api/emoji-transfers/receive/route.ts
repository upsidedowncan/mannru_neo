import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUser, getEmojiTransfer, useEmojiTransfer, updateUserBalance, createTransaction, createNotification } from '@/lib/db';
import { validateEmojiCode } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code || !validateEmojiCode(code)) {
      return NextResponse.json({ error: 'Invalid emoji code' }, { status: 400 });
    }

    const user = await getUser(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the emoji transfer
    const emojiTransfer = await getEmojiTransfer(code);
    if (!emojiTransfer) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    if (emojiTransfer.userId === session.userId) {
      return NextResponse.json({ error: 'Cannot receive your own transfer' }, { status: 400 });
    }

    // Mark as used
    const used = await useEmojiTransfer(code);
    if (!used) {
      return NextResponse.json({ error: 'Code already used or expired' }, { status: 400 });
    }

    // Add money to receiver
    await updateUserBalance(session.userId, emojiTransfer.amount, 'add');

    // Create transaction record
    await createTransaction(session.userId, emojiTransfer.userId, emojiTransfer.amount, 'transfer', `Получено от ${emojiTransfer.senderUsername} (Emoji: ${code})`);

    // Create notification for sender
    await createNotification(emojiTransfer.userId, `Ваш перевод на ${emojiTransfer.amount} МР был получен`, 'success');

    // Create notification for receiver
    await createNotification(session.userId, `Вы получили ${emojiTransfer.amount} МР от ${emojiTransfer.senderUsername}`, 'success');

    return NextResponse.json({ success: true, amount: emojiTransfer.amount, sender: emojiTransfer.senderUsername });
  } catch (error) {
    console.error('Receive emoji transfer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
