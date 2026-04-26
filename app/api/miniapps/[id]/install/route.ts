import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { installMiniApp, uninstallMiniApp } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const installation = await installMiniApp(session.userId, params.id);
  if (!installation) {
    return NextResponse.json({ error: 'Already installed or not found' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const success = await uninstallMiniApp(session.userId, params.id);
  if (!success) {
    return NextResponse.json({ error: 'Not installed' }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
