import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PersistenceService } from '../src/lib/supabase.ts';

test('Supabase PersistenceService - Creates Room with Custom ID and Persists', async () => {
  const customId = 'test-room-' + Math.random().toString(36).substring(2, 8);
  const room = await PersistenceService.createRoom('Custom Architecture', true, customId);

  assert.equal(room.id, customId, 'Room ID should match requested customId');
  assert.equal(room.name, 'Custom Architecture');

  // Verify retrieval
  const fetched = await PersistenceService.getRoom(customId);
  assert.ok(fetched, 'Should fetch created room');
  assert.equal(fetched.id, customId);
  assert.equal(fetched.name, 'Custom Architecture');
});

test('Supabase PersistenceService - Updates Room Snapshot and Name', async () => {
  const roomId = 'test-room-' + Math.random().toString(36).substring(2, 8);
  await PersistenceService.createRoom('Initial Name', true, roomId);

  const updated = await PersistenceService.updateRoom(roomId, {
    name: 'Updated Name',
    snapshot_data: JSON.stringify([{ id: 'shape:1', type: 'geo' }]),
  });

  assert.equal(updated, true, 'Update should succeed');
  const fetched = await PersistenceService.getRoom(roomId);
  assert.equal(fetched.name, 'Updated Name');
  assert.ok(fetched.snapshot_data?.includes('shape:1'));
});

test('Supabase PersistenceService - Upserts and Retrieves Shape Context with Native Arrays', async () => {
  const roomId = 'room-ctx-' + Math.random().toString(36).substring(2, 8);
  const shapeId = 'shape-auth-service';

  const contextData = {
    notes: 'Handles JWT authorization and rate limits',
    links: [{ id: 'link-1', title: 'OAuth Spec', url: 'https://oauth.net/2/' }],
    codeSnippets: [{ id: 'code-1', language: 'typescript', code: 'export function auth() {}' }],
    files: [{ id: 'file-1', name: 'schema.prisma', size: 1024, type: 'text/plain' }],
  };

  const saved = await PersistenceService.upsertShapeContext(roomId, shapeId, contextData);
  assert.equal(saved, true, 'Upsert should return true');

  const contexts = await PersistenceService.getShapeContexts(roomId);
  assert.ok(contexts[shapeId], 'Shape context must exist for shapeId');
  assert.equal(contexts[shapeId].notes, contextData.notes);
  assert.equal(contexts[shapeId].links.length, 1);
  assert.equal(contexts[shapeId].links[0].title, 'OAuth Spec');
  assert.equal(contexts[shapeId].codeSnippets.length, 1);
  assert.equal(contexts[shapeId].files.length, 1);
});
