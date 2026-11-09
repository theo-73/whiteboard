import { NextResponse } from 'next/server';
import { PersistenceService } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const room = await PersistenceService.getRoom(id);

    return NextResponse.json({
      room,
      members: [],
    });
  } catch (error) {
    console.error('Fetch room error:', error);
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const name = body?.name;
    const snapshotData = body?.snapshotData || body?.snapshot_data;

    const updates: { name?: string; snapshot_data?: string } = {};
    if (name !== undefined) updates.name = name;
    if (snapshotData !== undefined) {
      updates.snapshot_data = typeof snapshotData === 'string' ? snapshotData : JSON.stringify(snapshotData);
    }

    if (Object.keys(updates).length > 0) {
      await PersistenceService.updateRoom(id, updates);
    }

    return NextResponse.json({ success: true, roomId: id });
  } catch (error) {
    console.error('Update room snapshot error:', error);
    return NextResponse.json({ error: 'Failed to update snapshot' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await PersistenceService.deleteRoom(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Room not found or delete failed' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedRoomId: id });
  } catch (error) {
    console.error('Delete room error:', error);
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
  }
}
