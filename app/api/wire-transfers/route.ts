import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getWireTransfers, createWireTransfer, executeWireTransfer, pauseWireTransfer, resumeWireTransfer, deleteWireTransfer, readDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Execute all active wires for this user before fetching
    const db = await readDB();
    const userActiveWires = db.wireTransfers.filter((w) => w.userId === session.userId && w.status === 'active');
    
    for (const wire of userActiveWires) {
      try {
        await executeWireTransfer(wire.id);
      } catch (error) {
        console.error(`Failed to execute wire ${wire.id}:`, error);
      }
    }

    const wireTransfers = await getWireTransfers(session.userId);
    return NextResponse.json({ wireTransfers });
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
    const { fromCardId, toCardId, amount } = body;

    if (!fromCardId || !toCardId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (fromCardId === toCardId) {
      return NextResponse.json({ error: 'Cannot transfer to same card' }, { status: 400 });
    }

    const wireTransfer = await createWireTransfer(session.userId, fromCardId, toCardId, amount);
    return NextResponse.json({ wireTransfer });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
