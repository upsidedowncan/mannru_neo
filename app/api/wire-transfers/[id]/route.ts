import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { executeWireTransfer, pauseWireTransfer, resumeWireTransfer, deleteWireTransfer } from '@/lib/db';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const { id: wireId } = await params;

    if (action === 'execute') {
      const wireTransfer = await executeWireTransfer(wireId);
      if (!wireTransfer) {
        return NextResponse.json({ error: 'Wire transfer not found' }, { status: 404 });
      }
      return NextResponse.json({ wireTransfer });
    } else if (action === 'pause') {
      const success = await pauseWireTransfer(wireId, session.userId);
      if (!success) {
        return NextResponse.json({ error: 'Failed to pause wire transfer' }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    } else if (action === 'resume') {
      const success = await resumeWireTransfer(wireId, session.userId);
      if (!success) {
        return NextResponse.json({ error: 'Failed to resume wire transfer' }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: wireId } = await params;
    const success = await deleteWireTransfer(wireId, session.userId);

    if (!success) {
      return NextResponse.json({ error: 'Wire transfer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
