import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCards, createCard, updateCardBalance, deleteCard, CardTier, getUser, updateUserBalance, readDB, writeDB } from '@/lib/db';
import { TIER_PRICES } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cards = await getCards(session.userId);
    return NextResponse.json({ cards });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tier, paymentCardId } = body;

    if (!tier || !['standard', 'gold', 'platinum', 'black'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const tierCost = TIER_PRICES[tier as CardTier];
    const db = await readDB();
    const user = db.users.find((u) => u.id === session.userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (tierCost > 0) {
      if (!paymentCardId) {
        return NextResponse.json({ error: 'Payment card required for paid tiers' }, { status: 400 });
      }

      const paymentCard = db.cards.find((c) => c.id === paymentCardId && c.userId === session.userId && c.isActive);
      if (!paymentCard) {
        return NextResponse.json({ error: 'Payment card not found' }, { status: 404 });
      }

      if (paymentCard.balance < tierCost) {
        return NextResponse.json({ error: 'Insufficient card balance' }, { status: 400 });
      }

      // Deduct tier cost from payment card balance
      const paymentCardIndex = db.cards.findIndex((c) => c.id === paymentCardId);
      db.cards[paymentCardIndex].balance -= tierCost;
    }

    // Create new card inline to avoid multiple database reads
    const lastFour = Math.floor(1000 + Math.random() * 9000).toString();
    const newCard = {
      id: crypto.randomUUID(),
      userId: session.userId,
      tier: tier as CardTier,
      lastFour,
      balance: 0,
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    
    db.cards.push(newCard);
    await writeDB(db);
    
    return NextResponse.json({ card: newCard });
  } catch (error) {
    console.error('Card creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cardId, amount, operation } = body;

    if (!cardId || !amount || !operation || !['add', 'subtract'].includes(operation)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const user = await getUser(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const db = await readDB();
    const card = db.cards.find((c) => c.id === cardId && c.userId === session.userId);
    
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (operation === 'add') {
      // Transfer from user balance to card
      if (user.balance < amount) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }
      
      const userIndex = db.users.findIndex((u) => u.id === session.userId);
      const cardIndex = db.cards.findIndex((c) => c.id === cardId);
      
      db.users[userIndex].balance -= amount;
      db.cards[cardIndex].balance += amount;
      
      await writeDB(db);
      
      return NextResponse.json({ card: db.cards[cardIndex] });
    } else {
      // Transfer from card to user balance
      if (card.balance < amount) {
        return NextResponse.json({ error: 'Insufficient card balance' }, { status: 400 });
      }
      
      const userIndex = db.users.findIndex((u) => u.id === session.userId);
      const cardIndex = db.cards.findIndex((c) => c.id === cardId);
      
      db.users[userIndex].balance += amount;
      db.cards[cardIndex].balance -= amount;
      
      await writeDB(db);
      
      return NextResponse.json({ card: db.cards[cardIndex] });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');

    if (!cardId) {
      return NextResponse.json({ error: 'Card ID required' }, { status: 400 });
    }

    const success = await deleteCard(cardId, session.userId);
    
    if (!success) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
