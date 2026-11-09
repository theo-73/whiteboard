import { NextResponse } from 'next/server';
import { PersistenceService } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = body?.id;
    const name = body?.name || 'Untitled Architecture Board';
    const isPublic = body?.isPublic ?? true;

    const room = await PersistenceService.createRoom(name, isPublic, id);

    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const shareUrl = `${origin}/board/${room.id}`;

    return NextResponse.json({
      success: true,
      roomId: room.id,
      shareUrl,
      room,
    });
  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'Room API ready' });
}
