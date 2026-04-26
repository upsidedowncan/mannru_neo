import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getMiniAppById, updateMiniApp, deleteMiniApp } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const miniApp = await getMiniAppById(id);
  if (!miniApp) {
    return NextResponse.json({ error: 'MiniApp not found' }, { status: 404 });
  }

  return NextResponse.json({ miniApp });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id } = await params;
    const miniApp = await getMiniAppById(id);

    if (!miniApp) {
      return NextResponse.json({ error: 'MiniApp not found' }, { status: 404 });
    }

    if (miniApp.authorId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await updateMiniApp(id, body);
    return NextResponse.json({ miniApp: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update miniapp' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const miniApp = await getMiniAppById(id);
  if (!miniApp) {
    return NextResponse.json({ error: 'MiniApp not found' }, { status: 404 });
  }

  if (miniApp.authorId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const success = await deleteMiniApp(id, session.userId);
  if (!success) {
    return NextResponse.json({ error: 'Failed to delete miniapp' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
