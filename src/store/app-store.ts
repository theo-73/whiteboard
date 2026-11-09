import { create } from 'zustand';

export type Tool = 'select' | 'hand' | 'draw' | 'rectangle' | 'ellipse' | 'arrow' | 'text' | 'eraser' | 'ai';

export interface Room {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

export interface AISuggestion {
  id: string;
  type?: 'node' | 'edge' | 'diagram';
  content?: string;
  title?: string;
  description?: string;
  mermaidCode?: string;
  code?: string;
  status?: 'pending' | 'streaming' | 'ready' | 'accepted' | 'rejected';
  timestamp?: number;
}

interface AppState {
  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Current tool
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;

  // Sidebar & panels
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  aiPanelOpen: boolean;
  toggleAiPanel: () => void;

  // Room
  currentRoom: Room | null;
  setCurrentRoom: (room: Room | null) => void;

  // User
  currentUser: User;
  setCurrentUser: (user: User) => void;

  // Connected users (multiplayer presence)
  connectedUsers: User[];
  setConnectedUsers: (users: User[]) => void;

  // AI
  aiSuggestions: AISuggestion[];
  addAiSuggestion: (suggestion: AISuggestion) => void;
  updateAiSuggestion: (id: string, updates: Partial<AISuggestion>) => void;
  removeAiSuggestion: (id: string) => void;
  clearAiSuggestions: () => void;
  isAiThinking: boolean;
  setIsAiThinking: (thinking: boolean) => void;

  // AI prompt
  aiPrompt: string;
  setAiPrompt: (prompt: string) => void;

  // Follow Mode
  followingUserId: string | null;
  setFollowingUserId: (id: string | null) => void;

  // Ghost Shapes
  ghostShapeIds: string[];
  setGhostShapeIds: (ids: string[]) => void;
  addGhostShapeId: (id: string) => void;
  clearGhostShapeIds: () => void;

  // Replay Mode (protects multiplayer Yjs synchronization from spectator scrubbing)
  isReplaying: boolean;
  setIsReplaying: (isReplaying: boolean) => void;
  getLiveRecords?: () => unknown[];
  setGetLiveRecords: (fn: (() => unknown[]) | undefined) => void;

  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  setCanUndo: (can: boolean) => void;
  setCanRedo: (can: boolean) => void;
}

const COLORS = ['#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#a78bfa'];

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function getRandomName() {
  const adjectives = ['Swift', 'Bold', 'Calm', 'Keen', 'Wise'];
  const nouns = ['Fox', 'Owl', 'Bear', 'Wolf', 'Hawk'];
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
}

export const useAppStore = create<AppState>((set) => ({
  // Theme
  theme: 'dark',
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', newTheme);
      }
      return { theme: newTheme };
    }),

  // Tool
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),

  // Sidebar
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // AI Panel
  aiPanelOpen: false,
  toggleAiPanel: () => set((state) => ({ aiPanelOpen: !state.aiPanelOpen })),

  // Room
  currentRoom: null,
  setCurrentRoom: (room) => set({ currentRoom: room }),

  // User
  currentUser: {
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : 'user-1',
    name: getRandomName(),
    color: getRandomColor(),
  },
  setCurrentUser: (user) => set({ currentUser: user }),

  // Connected users
  connectedUsers: [],
  setConnectedUsers: (users) => set({ connectedUsers: users }),

  // AI
  aiSuggestions: [],
  addAiSuggestion: (suggestion) =>
    set((state) => ({ aiSuggestions: [...state.aiSuggestions, suggestion] })),
  updateAiSuggestion: (id, updates) =>
    set((state) => ({
      aiSuggestions: state.aiSuggestions.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
  removeAiSuggestion: (id) =>
    set((state) => ({
      aiSuggestions: state.aiSuggestions.filter((s) => s.id !== id),
    })),
  clearAiSuggestions: () => set({ aiSuggestions: [] }),
  isAiThinking: false,
  setIsAiThinking: (thinking) => set({ isAiThinking: thinking }),

  // AI Prompt
  aiPrompt: '',
  setAiPrompt: (prompt) => set({ aiPrompt: prompt }),

  // Follow Mode
  followingUserId: null,
  setFollowingUserId: (id) => set({ followingUserId: id }),

  // Ghost Shapes
  ghostShapeIds: [],
  setGhostShapeIds: (ids) => set({ ghostShapeIds: ids }),
  addGhostShapeId: (id) => set((state) => ({ ghostShapeIds: [...state.ghostShapeIds, id] })),
  clearGhostShapeIds: () => set({ ghostShapeIds: [] }),

  // Replay Mode
  isReplaying: false,
  setIsReplaying: (isReplaying) => set({ isReplaying }),
  getLiveRecords: undefined,
  setGetLiveRecords: (fn) => set({ getLiveRecords: fn }),

  // Undo/Redo
  canUndo: false,
  canRedo: false,
  setCanUndo: (can) => set({ canUndo: can }),
  setCanRedo: (can) => set({ canRedo: can }),
}));
