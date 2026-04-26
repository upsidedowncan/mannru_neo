import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getVariableState, getMiniAppById } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ miniAppId: string; variableId: string }> }
) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { miniAppId, variableId } = await params;

  try {
    // Verify the miniapp exists
    const miniApp = await getMiniAppById(miniAppId);
    if (!miniApp) {
      return NextResponse.json({ error: 'MiniApp not found' }, { status: 404 });
    }

    // Verify the variable belongs to this miniapp
    const variable = miniApp.variables.find((v) => v.id === variableId);
    if (!variable) {
      return NextResponse.json({ error: 'Variable not found' }, { status: 404 });
    }

    const value = await getVariableState(session.userId, miniAppId, variableId);
    return NextResponse.json({ value, defaultValue: variable.defaultValue });
  } catch (error) {
    console.error('Failed to fetch variable:', error);
    return NextResponse.json({ error: 'Failed to fetch variable' }, { status: 500 });
  }
}
