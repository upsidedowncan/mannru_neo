import { NextRequest, NextResponse } from 'next/server';
import { getMiniAppById, setVariableState } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { miniAppId, variableId, value } = body;

    if (!miniAppId || !variableId || value === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const miniApp = await getMiniAppById(miniAppId);
    if (!miniApp) {
      return NextResponse.json({ error: 'MiniApp not found' }, { status: 404 });
    }

    const variable = miniApp.variables?.find((v: any) => v.id === variableId);
    if (!variable) {
      return NextResponse.json({ error: 'Variable not found' }, { status: 404 });
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await setVariableState(session.userId, miniAppId, variableId, value);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Variable set error:', error);
    return NextResponse.json({ error: 'Failed to set variable value' }, { status: 500 });
  }
}
