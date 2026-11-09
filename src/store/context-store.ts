import { create } from 'zustand';

export interface ContextLink {
  id: string;
  title: string;
  url: string;
}

export interface ContextCodeSnippet {
  id: string;
  language: string;
  code: string;
}

export interface ContextFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}

export interface ShapeContext {
  shapeId: string;
  notes: string;
  links: ContextLink[];
  codeSnippets: ContextCodeSnippet[];
  files: ContextFile[];
}

interface ContextState {
  // Room scope
  roomId: string;
  setRoomId: (roomId: string) => void;

  // Map of shapeId -> ShapeContext
  contexts: Record<string, ShapeContext>;
  
  // Selected shape context panel state
  activeShapeId: string | null;
  activeShapeLabel: string;
  isContextPanelOpen: boolean;
  
  // Actions
  openContextPanel: (shapeId: string, shapeLabel?: string) => void;
  closeContextPanel: () => void;
  getShapeContext: (shapeId: string) => ShapeContext;
  updateNotes: (shapeId: string, notes: string) => void;
  addLink: (shapeId: string, link: Omit<ContextLink, 'id'>) => void;
  removeLink: (shapeId: string, linkId: string) => void;
  addCodeSnippet: (shapeId: string, snippet: Omit<ContextCodeSnippet, 'id'>) => void;
  removeCodeSnippet: (shapeId: string, snippetId: string) => void;
  addFile: (shapeId: string, file: Omit<ContextFile, 'id'>) => void;
  removeFile: (shapeId: string, fileId: string) => void;
  hasContext: (shapeId: string) => boolean;
}

const defaultContext = (shapeId: string): ShapeContext => ({
  shapeId,
  notes: '',
  links: [],
  codeSnippets: [],
  files: [],
});

function loadContextsFromStorage(roomId: string): Record<string, ShapeContext> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`synapseboard_context_${roomId}`);
    return raw ? (JSON.parse(raw) as Record<string, ShapeContext>) : {};
  } catch (err) {
    console.error('Failed to load shape contexts:', err);
    return {};
  }
}

function saveContextsToStorage(roomId: string, contexts: Record<string, ShapeContext>) {
  if (typeof window === 'undefined') return;
  const key = `synapseboard_context_${roomId}`;
  try {
    localStorage.setItem(key, JSON.stringify(contexts));
  } catch (err) {
    console.warn('Quota exceeded while saving shape contexts, stripping heavy binary payloads:', err);
    try {
      // Graceful fallback: preserve all notes, links, snippets, and file metadata without heavy Base64 dataUrls
      const lightweightCopy: Record<string, ShapeContext> = {};
      Object.entries(contexts).forEach(([sId, ctx]) => {
        lightweightCopy[sId] = {
          ...ctx,
          files: ctx.files.map((f) => ({
            id: f.id,
            name: f.name,
            size: f.size,
            type: f.type,
          })),
        };
      });
      localStorage.setItem(key, JSON.stringify(lightweightCopy));
    } catch (fallbackErr) {
      console.error('Failed to save shape contexts to localStorage:', fallbackErr);
    }
  }
}

const syncTimeouts = new Map<string, NodeJS.Timeout>();

function syncShapeContextToBackend(roomId: string, shapeId: string, ctx: ShapeContext) {
  if (typeof window === 'undefined' || !roomId || !shapeId) return;
  const key = `${roomId}:${shapeId}`;
  const existing = syncTimeouts.get(key);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    fetch(`/api/rooms/${roomId}/context`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shapeId,
        notes: ctx.notes,
        links: ctx.links,
        codeSnippets: ctx.codeSnippets,
        files: ctx.files,
      }),
    }).catch((err) => console.warn('Context sync error:', err));
    syncTimeouts.delete(key);
  }, 800);

  syncTimeouts.set(key, timer);
}

export const useContextStore = create<ContextState>((set, get) => ({
  roomId: 'default-room',
  contexts: {},
  activeShapeId: null,
  activeShapeLabel: 'Selected Component',
  isContextPanelOpen: false,

  setRoomId: (roomId: string) => {
    const loaded = loadContextsFromStorage(roomId);
    set({ roomId, contexts: loaded });

    if (roomId && typeof window !== 'undefined') {
      fetch(`/api/rooms/${roomId}/context`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.contexts && typeof data.contexts === 'object') {
            set((state) => {
              const merged = { ...state.contexts, ...data.contexts };
              saveContextsToStorage(roomId, merged);
              return { contexts: merged };
            });
          }
        })
        .catch((e) => console.warn('Failed to fetch remote shape contexts:', e));
    }
  },

  openContextPanel: (shapeId: string, shapeLabel?: string) => {
    set({
      activeShapeId: shapeId,
      activeShapeLabel: shapeLabel || 'Selected Component',
      isContextPanelOpen: true,
    });
  },

  closeContextPanel: () => {
    set({ isContextPanelOpen: false, activeShapeId: null });
  },

  getShapeContext: (shapeId: string) => {
    return get().contexts[shapeId] || defaultContext(shapeId);
  },

  updateNotes: (shapeId: string, notes: string) => {
    set((state) => {
      const current = state.contexts[shapeId] || defaultContext(shapeId);
      const updated = {
        ...state.contexts,
        [shapeId]: { ...current, notes },
      };
      saveContextsToStorage(state.roomId, updated);
      syncShapeContextToBackend(state.roomId, shapeId, updated[shapeId]);
      return { contexts: updated };
    });
  },

  addLink: (shapeId: string, link) => {
    set((state) => {
      const current = state.contexts[shapeId] || defaultContext(shapeId);
      const newLink: ContextLink = { ...link, id: Date.now().toString() };
      const updated = {
        ...state.contexts,
        [shapeId]: { ...current, links: [...current.links, newLink] },
      };
      saveContextsToStorage(state.roomId, updated);
      syncShapeContextToBackend(state.roomId, shapeId, updated[shapeId]);
      return { contexts: updated };
    });
  },

  removeLink: (shapeId: string, linkId: string) => {
    set((state) => {
      const current = state.contexts[shapeId];
      if (!current) return state;
      const updated = {
        ...state.contexts,
        [shapeId]: {
          ...current,
          links: current.links.filter((l) => l.id !== linkId),
        },
      };
      saveContextsToStorage(state.roomId, updated);
      syncShapeContextToBackend(state.roomId, shapeId, updated[shapeId]);
      return { contexts: updated };
    });
  },

  addCodeSnippet: (shapeId: string, snippet) => {
    set((state) => {
      const current = state.contexts[shapeId] || defaultContext(shapeId);
      const newSnippet: ContextCodeSnippet = { ...snippet, id: Date.now().toString() };
      const updated = {
        ...state.contexts,
        [shapeId]: { ...current, codeSnippets: [...current.codeSnippets, newSnippet] },
      };
      saveContextsToStorage(state.roomId, updated);
      syncShapeContextToBackend(state.roomId, shapeId, updated[shapeId]);
      return { contexts: updated };
    });
  },

  removeCodeSnippet: (shapeId: string, snippetId: string) => {
    set((state) => {
      const current = state.contexts[shapeId];
      if (!current) return state;
      const updated = {
        ...state.contexts,
        [shapeId]: {
          ...current,
          codeSnippets: current.codeSnippets.filter((c) => c.id !== snippetId),
        },
      };
      saveContextsToStorage(state.roomId, updated);
      syncShapeContextToBackend(state.roomId, shapeId, updated[shapeId]);
      return { contexts: updated };
    });
  },

  addFile: (shapeId: string, file) => {
    set((state) => {
      const current = state.contexts[shapeId] || defaultContext(shapeId);
      // Cap dataUrl to 250KB to preserve localStorage headroom
      const safeDataUrl = file.dataUrl && file.dataUrl.length < 250000 ? file.dataUrl : undefined;
      const newFile: ContextFile = { ...file, dataUrl: safeDataUrl, id: Date.now().toString() };
      const updated = {
        ...state.contexts,
        [shapeId]: { ...current, files: [...current.files, newFile] },
      };
      saveContextsToStorage(state.roomId, updated);
      syncShapeContextToBackend(state.roomId, shapeId, updated[shapeId]);
      return { contexts: updated };
    });
  },

  removeFile: (shapeId: string, fileId: string) => {
    set((state) => {
      const current = state.contexts[shapeId];
      if (!current) return state;
      const updated = {
        ...state.contexts,
        [shapeId]: {
          ...current,
          files: current.files.filter((f) => f.id !== fileId),
        },
      };
      saveContextsToStorage(state.roomId, updated);
      syncShapeContextToBackend(state.roomId, shapeId, updated[shapeId]);
      return { contexts: updated };
    });
  },

  hasContext: (shapeId: string) => {
    const ctx = get().contexts[shapeId];
    if (!ctx) return false;
    return (
      Boolean(ctx.notes?.trim()) ||
      ctx.links.length > 0 ||
      ctx.codeSnippets.length > 0 ||
      ctx.files.length > 0
    );
  },
}));
