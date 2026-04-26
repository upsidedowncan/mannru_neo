import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getMiniApps, createMiniApp, getUserMiniApps, getUserCreatedMiniApps } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  const { searchParams } = new URL(request.url);
  const includePrivate = searchParams.get('includePrivate') === 'true';

  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (searchParams.get('my') === 'true') {
    const myApps = await getUserMiniApps(session.userId);
    return NextResponse.json({ miniApps: myApps });
  }

  if (searchParams.get('created') === 'true') {
    const createdApps = await getUserCreatedMiniApps(session.userId);
    return NextResponse.json({ miniApps: createdApps });
  }

  const miniApps = await getMiniApps(includePrivate);
  return NextResponse.json({ miniApps });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, components, variables, nodes, edges, isPublic } = body;

    if (!name || !description || !components) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/user`)
      .then(res => res.json())
      .then(data => data.user);

    const miniApp = await createMiniApp({
      name,
      description,
      authorId: session.userId,
      authorUsername: user?.username || 'unknown',
      components,
      variables: variables || [],
      nodes: nodes || [],
      edges: edges || [],
      isPublic: isPublic || false,
    });

    return NextResponse.json({ miniApp }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create miniapp' }, { status: 500 });
  }
}
