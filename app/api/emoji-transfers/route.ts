import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUser, createEmojiTransfer, getUserEmojiTransfers } from '@/lib/db';
import { generateEmojiCode } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const user = await getUser(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // Generate emoji code
    const code = generateEmojiCode(5);
    const emojiTransfer = await createEmojiTransfer(session.userId, code, amount, user.username);

    return NextResponse.json({ emojiTransfer });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emojiTransfers = await getUserEmojiTransfers(session.userId);
    return NextResponse.json({ emojiTransfers });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
