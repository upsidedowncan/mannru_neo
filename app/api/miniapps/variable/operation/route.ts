import { NextRequest, NextResponse } from 'next/server';
import { getMiniAppById, getVariableState, setVariableState, incrementVariable } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { miniAppId, variableId, operation, amount } = body;

    if (!miniAppId || !variableId || !operation || amount === undefined) {
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

    let newValue: number;

    if (operation === 'add') {
      newValue = await incrementVariable(session.userId, miniAppId, variableId, amount);
    } else if (operation === 'subtract') {
      newValue = await incrementVariable(session.userId, miniAppId, variableId, -amount);
    } else {
      return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    }

    return NextResponse.json({ newValue });
  } catch (error) {
    console.error('Variable operation error:', error);
    return NextResponse.json({ error: 'Failed to execute variable operation' }, { status: 500 });
  }
}
