// Supabase persistence client helper with in-memory / local fallback

export interface RoomRecord {
  id: string;
  name: string;
  is_public: boolean;
  snapshot_data?: string;
  created_at: string;
  updated_at: string;
}

export interface ShapeContextRecord {
  id?: string;
  room_id: string;
  shape_id: string;
  notes: string;
  links_json: string | unknown[];
  code_snippets_json: string | unknown[];
  files_json: string | unknown[];
  created_at?: string;
  updated_at?: string;
}

// Memory / Local persistent fallback map for environments without Supabase credentials
const memoryRooms = new Map<string, RoomRecord>();
const memoryContexts = new Map<string, Map<string, ShapeContextRecord>>();

export class PersistenceService {
  private static supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  private static supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  public static async createRoom(name: string, isPublic: boolean = true, customId?: string): Promise<RoomRecord> {
    const roomId = customId || Math.random().toString(36).substring(2, 12);
    const now = new Date().toISOString();
    
    const newRoom: RoomRecord = {
      id: roomId,
      name,
      is_public: isPublic,
      created_at: now,
      updated_at: now,
    };

    if (this.supabaseUrl && this.supabaseKey) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(newRoom),
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data[0]) return data[0] as RoomRecord;
        }
      } catch (err) {
        console.warn('Supabase createRoom warning, falling back to local memory:', err);
      }
    }

    memoryRooms.set(roomId, newRoom);
    return newRoom;
  }

  public static async getRoom(id: string): Promise<RoomRecord | null> {
    if (this.supabaseUrl && this.supabaseKey) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/rooms?id=eq.${id}&select=*`, {
          method: 'GET',
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data[0]) return data[0] as RoomRecord;
        }
      } catch (err) {
        console.warn('Supabase getRoom warning, falling back to local memory:', err);
      }
    }

    return memoryRooms.get(id) || {
      id,
      name: `Architecture Room ${id.substring(0, 4)}`,
      is_public: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  public static async updateRoom(
    id: string,
    updates: { name?: string; snapshot_data?: string; is_public?: boolean }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const payload: Record<string, unknown> = { updated_at: now };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.snapshot_data !== undefined) payload.snapshot_data = updates.snapshot_data;
    if (updates.is_public !== undefined) payload.is_public = updates.is_public;

    if (this.supabaseUrl && this.supabaseKey) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/rooms?id=eq.${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) return true;
      } catch (err) {
        console.warn('Supabase updateRoom warning:', err);
      }
    }

    const existing = memoryRooms.get(id);
    if (existing) {
      if (updates.name !== undefined) existing.name = updates.name;
      if (updates.snapshot_data !== undefined) existing.snapshot_data = updates.snapshot_data;
      if (updates.is_public !== undefined) existing.is_public = updates.is_public;
      existing.updated_at = now;
      memoryRooms.set(id, existing);
    }
    return true;
  }

  public static async updateRoomSnapshot(id: string, snapshotData: string): Promise<boolean> {
    return this.updateRoom(id, { snapshot_data: snapshotData });
  }

  public static async deleteRoom(id: string): Promise<boolean> {
    if (this.supabaseUrl && this.supabaseKey) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/rooms?id=eq.${id}`, {
          method: 'DELETE',
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
          },
        });

        if (res.ok) return true;
      } catch (err) {
        console.warn('Supabase deleteRoom warning:', err);
      }
    }

    memoryRooms.delete(id);
    memoryContexts.delete(id);
    return true;
  }

  public static async getShapeContexts(roomId: string): Promise<Record<string, {
    notes: string;
    links: Array<{ id: string; title: string; url: string }>;
    codeSnippets: Array<{ id: string; language: string; code: string }>;
    files: Array<{ id: string; name: string; size: number; type: string; dataUrl?: string }>;
  }>> {
    const result: Record<string, {
      notes: string;
      links: Array<{ id: string; title: string; url: string }>;
      codeSnippets: Array<{ id: string; language: string; code: string }>;
      files: Array<{ id: string; name: string; size: number; type: string; dataUrl?: string }>;
    }> = {};

    if (this.supabaseUrl && this.supabaseKey) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/shape_contexts?room_id=eq.${roomId}&select=*`, {
          method: 'GET',
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
          },
        });

        if (res.ok) {
          const rows = await res.json();
          if (Array.isArray(rows)) {
            rows.forEach((r: Record<string, unknown>) => {
              try {
                const shapeId = String(r.shape_id || '');
                if (!shapeId) return;
                result[shapeId] = {
                  notes: String(r.notes || ''),
                  links: typeof r.links_json === 'string' ? JSON.parse(r.links_json) : (Array.isArray(r.links_json) ? r.links_json : []),
                  codeSnippets: typeof r.code_snippets_json === 'string' ? JSON.parse(r.code_snippets_json) : (Array.isArray(r.code_snippets_json) ? r.code_snippets_json : []),
                  files: typeof r.files_json === 'string' ? JSON.parse(r.files_json) : (Array.isArray(r.files_json) ? r.files_json : []),
                };
              } catch (e) {
                console.warn('Failed to parse shape context row:', e);
              }
            });
            return result;
          }
        }
      } catch (err) {
        console.warn('Supabase getShapeContexts warning, falling back to local memory:', err);
      }
    }

    const roomCtxMap = memoryContexts.get(roomId);
    if (roomCtxMap) {
      roomCtxMap.forEach((rec, shapeId) => {
        try {
          result[shapeId] = {
            notes: rec.notes || '',
            links: Array.isArray(rec.links_json) ? (rec.links_json as unknown as Array<{ id: string; title: string; url: string }>) : (typeof rec.links_json === 'string' ? JSON.parse(rec.links_json) : []),
            codeSnippets: Array.isArray(rec.code_snippets_json) ? (rec.code_snippets_json as unknown as Array<{ id: string; language: string; code: string }>) : (typeof rec.code_snippets_json === 'string' ? JSON.parse(rec.code_snippets_json) : []),
            files: Array.isArray(rec.files_json) ? (rec.files_json as unknown as Array<{ id: string; name: string; size: number; type: string; dataUrl?: string }>) : (typeof rec.files_json === 'string' ? JSON.parse(rec.files_json) : []),
          };
        } catch {
          // ignore
        }
      });
    }

    return result;
  }

  public static async upsertShapeContext(
    roomId: string,
    shapeId: string,
    contextData: {
      notes?: string;
      links?: unknown[];
      codeSnippets?: unknown[];
      files?: unknown[];
    }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const payload = {
      room_id: roomId,
      shape_id: shapeId,
      notes: contextData.notes || '',
      links_json: Array.isArray(contextData.links) ? contextData.links : [],
      code_snippets_json: Array.isArray(contextData.codeSnippets) ? contextData.codeSnippets : [],
      files_json: Array.isArray(contextData.files) ? contextData.files : [],
      updated_at: now,
    };

    if (this.supabaseUrl && this.supabaseKey) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/shape_contexts?on_conflict=room_id,shape_id`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) return true;
      } catch (err) {
        console.warn('Supabase upsertShapeContext warning:', err);
      }
    }

    if (!memoryContexts.has(roomId)) {
      memoryContexts.set(roomId, new Map());
    }
    memoryContexts.get(roomId)!.set(shapeId, {
      ...payload,
      created_at: now,
    });

    return true;
  }
}
