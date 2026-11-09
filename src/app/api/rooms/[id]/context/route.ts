import { NextResponse } from 'next/server';
import { PersistenceService } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contexts = await PersistenceService.getShapeContexts(id);
    return NextResponse.json({ success: true, contexts });
  } catch (error) {
    console.error('Fetch shape contexts error:', error);
    return NextResponse.json({ error: 'Failed to fetch shape contexts' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;
    const body = await request.json();
    const { shapeId, notes, links, codeSnippets, files } = body || {};

    if (!shapeId) {
      return NextResponse.json({ error: 'shapeId is required' }, { status: 400 });
    }

    await PersistenceService.upsertShapeContext(roomId, shapeId, {
      notes,
      links,
      codeSnippets,
      files,
    });

    return NextResponse.json({ success: true, roomId, shapeId });
  } catch (error) {
    console.error('Upsert shape context error:', error);
    return NextResponse.json({ error: 'Failed to update shape context' }, { status: 500 });
  }
}
