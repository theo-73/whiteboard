"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/store/app-store";
import { useContextStore } from "@/store/context-store";
import { Editor, createShapeId, TLShapePartial } from "tldraw";
import { toRichText } from "@tldraw/tlschema";
import { Layers, ArrowLeft, Plus, LayoutTemplate, X } from "lucide-react";

import { TopBar } from "@/components/top-bar";
import { Toolbar } from "@/components/toolbar";
import { AiPanel } from "@/components/ai-panel";
import { ContextPanel } from "@/components/context-panel";
import { PresenceCursors } from "@/components/presence-cursors";
import { ZoomControls } from "@/components/zoom-controls";
import { LiveblocksProvider } from "@/components/liveblocks-provider";
import { TimeTravelReplay } from "@/components/time-travel-replay";
import { ContextBadges } from "@/components/context-badges";
import { ErrorBoundary } from "@/components/error-boundary";
import { LoadingSpinner } from "@/components/loading-spinner";
import { UndoRedo } from "@/components/undo-redo";
import { StyleBar } from "@/components/style-bar";

const CanvasWrapper = dynamic(() => import("@/components/canvas-wrapper"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
      <LoadingSpinner size="lg" text="Loading canvas..." />
    </div>
  ),
});

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const setCurrentRoom = useAppStore((state) => state.setCurrentRoom);
  const { setRoomId, openContextPanel } = useContextStore();
  
  const [editor, setEditor] = useState<Editor | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);
  const [roomLoaded, setRoomLoaded] = useState(false);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [showStarterPrompt, setShowStarterPrompt] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch room metadata & snapshot on mount
  useEffect(() => {
    if (id) {
      setRoomId(id);
      fetch(`/api/rooms/${id}`)
        .then((res) => {
          if (res.status === 404) {
            setRoomNotFound(true);
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (!data) return;
          if (data?.room) {
            setCurrentRoom({
              id: data.room.id,
              name: data.room.name || `Room ${id.substring(0, 4)}`,
              createdAt: new Date(data.room.created_at || Date.now()),
              updatedAt: new Date(data.room.updated_at || Date.now()),
            });
            if (data.room.snapshot_data) {
              setInitialSnapshot(data.room.snapshot_data);
            }
          }
        })
        .catch((err) => {
          console.warn("Failed to load room from API:", err);
        })
        .finally(() => setRoomLoaded(true));
    }
  }, [id, setCurrentRoom, setRoomId]);

  // Check if canvas is empty to show quiet starter template prompt
  useEffect(() => {
    if (!editor) return;
    const checkEmpty = () => {
      const shapeCount = editor.getCurrentPageShapeIds().size;
      setShowStarterPrompt(shapeCount === 0);
    };
    checkEmpty();
    const unlisten = editor.store.listen(checkEmpty, { scope: 'document' });
    return () => unlisten();
  }, [editor]);

  // Flush snapshot helper for debounce and beforeunload
  const flushSnapshot = useCallback(() => {
    if (!editor || !id) return;
    try {
      const allRecords = editor.store.allRecords();
      const documentRecords = allRecords.filter(
        (r) => r.typeName === 'shape' || r.typeName === 'binding' || r.typeName === 'asset'
      );
      if (documentRecords.length > 0) {
        const payload = JSON.stringify({ snapshotData: JSON.stringify(documentRecords) });
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon(`/api/rooms/${id}`, blob);
        } else {
          fetch(`/api/rooms/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: payload,
          }).catch(() => {});
        }
      }
    } catch {
      // ignore serialization error on exit
    }
  }, [editor, id]);

  // Debounced Auto-Save of Canvas Snapshot
  useEffect(() => {
    if (!editor || !id) return;

    const unlisten = editor.store.listen(
      () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
          flushSnapshot();
        }, 2000);
      },
      { scope: "document", source: "user" }
    );

    // Tab close / visibility flush
    const handleBeforeUnload = () => flushSnapshot();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushSnapshot();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unlisten();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editor, id, flushSnapshot]);

  // Reset room-scoped state on unmount or room navigation
  useEffect(() => {
    return () => {
      useAppStore.getState().clearGhostShapeIds();
      useAppStore.getState().clearAiSuggestions();
      useContextStore.getState().closeContextPanel();
    };
  }, [id]);

  // Reactive Shape Selection Listener: Syncs active shape to Context Panel only if already open
  useEffect(() => {
    if (!editor) return;

    const unlisten = editor.store.listen(
      () => {
        const selectedShapes = editor.getSelectedShapes();
        if (selectedShapes.length === 1) {
          const shape = selectedShapes[0];
          const props = (shape.props || {}) as { text?: string };
          const label = props.text || (shape.type === 'text' ? 'Text' : shape.type === 'note' ? 'Sticky Note' : 'Component');
          if (useContextStore.getState().isContextPanelOpen) {
            openContextPanel(shape.id.toString(), label);
          }
        }
      },
      { scope: "session" }
    );

    return () => {
      unlisten();
    };
  }, [editor, openContextPanel]);

  // Starter template loader
  const handleLoadStarterTemplate = (templateType: 'microservices' | 'pipeline') => {
    if (!editor) return;
    const center = editor.getViewportPageBounds().center;
    setShowStarterPrompt(false);

    if (templateType === 'microservices') {
      const gatewayId = createShapeId();
      const authId = createShapeId();
      const dbId = createShapeId();
      const redisId = createShapeId();

      const shapes: TLShapePartial[] = [
        { id: gatewayId, type: 'geo', x: center.x - 260, y: center.y - 40, props: { geo: 'rectangle', w: 160, h: 80, color: 'blue', fill: 'semi', richText: toRichText('API Gateway') } },
        { id: authId, type: 'geo', x: center.x, y: center.y - 120, props: { geo: 'rectangle', w: 160, h: 80, color: 'violet', fill: 'semi', richText: toRichText('Auth Service') } },
        { id: dbId, type: 'geo', x: center.x + 260, y: center.y - 40, props: { geo: 'ellipse', w: 160, h: 80, color: 'green', fill: 'semi', richText: toRichText('PostgreSQL DB') } },
        { id: redisId, type: 'geo', x: center.x, y: center.y + 60, props: { geo: 'rectangle', w: 160, h: 80, color: 'yellow', fill: 'semi', richText: toRichText('Redis Cache') } },
      ];

      const arrow1Id = createShapeId();
      const arrow2Id = createShapeId();
      const arrow3Id = createShapeId();

      shapes.push(
        { id: arrow1Id, type: 'arrow', x: center.x - 100, y: center.y - 40, props: { start: { x: 0, y: 0 }, end: { x: 100, y: -40 }, color: 'blue', richText: toRichText('Verify') } },
        { id: arrow2Id, type: 'arrow', x: center.x - 100, y: center.y + 20, props: { start: { x: 0, y: 0 }, end: { x: 100, y: 40 }, color: 'blue', richText: toRichText('Session') } },
        { id: arrow3Id, type: 'arrow', x: center.x + 160, y: center.y - 80, props: { start: { x: 0, y: 0 }, end: { x: 100, y: 40 }, color: 'violet', richText: toRichText('Query') } },
      );

      editor.createShapes(shapes);
      editor.createBindings([
        { type: 'arrow', fromId: arrow1Id, toId: gatewayId, props: { terminal: 'start', normalizedAnchor: { x: 1, y: 0.5 }, isExact: false, isPrecise: false } },
        { type: 'arrow', fromId: arrow1Id, toId: authId, props: { terminal: 'end', normalizedAnchor: { x: 0, y: 0.5 }, isExact: false, isPrecise: false } },
        { type: 'arrow', fromId: arrow2Id, toId: gatewayId, props: { terminal: 'start', normalizedAnchor: { x: 1, y: 0.5 }, isExact: false, isPrecise: false } },
        { type: 'arrow', fromId: arrow2Id, toId: redisId, props: { terminal: 'end', normalizedAnchor: { x: 0, y: 0.5 }, isExact: false, isPrecise: false } },
        { type: 'arrow', fromId: arrow3Id, toId: authId, props: { terminal: 'start', normalizedAnchor: { x: 1, y: 0.5 }, isExact: false, isPrecise: false } },
        { type: 'arrow', fromId: arrow3Id, toId: dbId, props: { terminal: 'end', normalizedAnchor: { x: 0, y: 0.5 }, isExact: false, isPrecise: false } },
      ]);
    } else if (templateType === 'pipeline') {
      const producerId = createShapeId();
      const brokerId = createShapeId();
      const consumerId = createShapeId();

      const arrow1Id = createShapeId();
      const arrow2Id = createShapeId();

      const shapes: TLShapePartial[] = [
        { id: producerId, type: 'geo', x: center.x - 240, y: center.y - 40, props: { geo: 'rectangle', w: 160, h: 80, color: 'blue', fill: 'semi', richText: toRichText('Event Producer') } },
        { id: brokerId, type: 'geo', x: center.x, y: center.y - 40, props: { geo: 'ellipse', w: 160, h: 80, color: 'yellow', fill: 'semi', richText: toRichText('Kafka Broker') } },
        { id: consumerId, type: 'geo', x: center.x + 240, y: center.y - 40, props: { geo: 'rectangle', w: 160, h: 80, color: 'green', fill: 'semi', richText: toRichText('Event Consumer') } },
        { id: arrow1Id, type: 'arrow', x: center.x - 80, y: center.y, props: { start: { x: 0, y: 0 }, end: { x: 80, y: 0 }, color: 'blue', richText: toRichText('Publish') } },
        { id: arrow2Id, type: 'arrow', x: center.x + 160, y: center.y, props: { start: { x: 0, y: 0 }, end: { x: 80, y: 0 }, color: 'green', richText: toRichText('Subscribe') } },
      ];
      editor.createShapes(shapes);
      editor.createBindings([
        { type: 'arrow', fromId: arrow1Id, toId: producerId, props: { terminal: 'start', normalizedAnchor: { x: 1, y: 0.5 }, isExact: false, isPrecise: false } },
        { type: 'arrow', fromId: arrow1Id, toId: brokerId, props: { terminal: 'end', normalizedAnchor: { x: 0, y: 0.5 }, isExact: false, isPrecise: false } },
        { type: 'arrow', fromId: arrow2Id, toId: brokerId, props: { terminal: 'start', normalizedAnchor: { x: 1, y: 0.5 }, isExact: false, isPrecise: false } },
        { type: 'arrow', fromId: arrow2Id, toId: consumerId, props: { terminal: 'end', normalizedAnchor: { x: 0, y: 0.5 }, isExact: false, isPrecise: false } },
      ]);
    }
  };

  const handleCreateNewRoomFrom404 = async () => {
    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: `Board ${id.substring(0, 4)}`, isPublic: true }),
      });
      setRoomNotFound(false);
      window.location.reload();
    } catch {
      router.push('/');
    }
  };

  // Honest 404 Room Not Found State
  if (roomNotFound) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-[var(--background)] text-[var(--text-primary)] p-4 font-sans">
        <div className="p-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center max-w-md flex flex-col items-center gap-4 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Layers size={24} />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Architecture Board Not Found</h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-mono">
            Room <code className="text-blue-400 font-bold">&quot;{id}&quot;</code> does not exist on the server or has been deleted.
          </p>
          <div className="flex items-center gap-3 pt-2 w-full justify-center">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Back to Dashboard
            </Link>
            <button
              onClick={handleCreateNewRoomFrom404}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Plus size={14} /> Initialize This Board
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LiveblocksProvider roomId={id || "default-room"}>
      <ErrorBoundary
        fallback={
          <div className="w-screen h-screen flex items-center justify-center bg-[var(--background)] text-[var(--text-primary)] font-sans">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center max-w-md shadow-lg">
              <h3 className="text-lg font-bold mb-2">Board Error</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Failed to load the whiteboard. Please refresh the page.</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)]"
              >
                Refresh Page
              </button>
            </div>
          </div>
        }
      >
        <div className="w-screen h-screen overflow-hidden relative bg-[var(--background)] text-[var(--text-primary)] font-sans select-none">
          {/* Tldraw Canvas Layer */}
          <div className="absolute inset-0 z-0">
            {roomLoaded && (
              <CanvasWrapper 
                roomId={id || "default-room"} 
                initialSnapshot={initialSnapshot} 
                onMount={setEditor} 
              />
            )}
          </div>

          {/* Quiet Empty Canvas Starter Prompt */}
          {showStarterPrompt && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]/95 shadow-xl backdrop-blur-md flex flex-col gap-3 max-w-md animate-fade-in pointer-events-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LayoutTemplate size={16} className="text-blue-400" />
                  <span className="text-xs font-bold text-[var(--text-primary)] font-mono">Blank Canvas • Starter Topologies</span>
                </div>
                <button
                  onClick={() => setShowStarterPrompt(false)}
                  className="text-[var(--text-secondary)] hover:text-white p-0.5 rounded"
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Start drawing freely with the toolbar, or load a connected architecture template:
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleLoadStarterTemplate('microservices')}
                  className="flex-1 py-1.5 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] hover:border-blue-500 text-[11px] font-semibold text-[var(--text-primary)] active:scale-95 transition-all text-center"
                >
                  Microservices Graph
                </button>
                <button
                  onClick={() => handleLoadStarterTemplate('pipeline')}
                  className="flex-1 py-1.5 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] hover:border-blue-500 text-[11px] font-semibold text-[var(--text-primary)] active:scale-95 transition-all text-center"
                >
                  Event Pipeline
                </button>
                <button
                  onClick={() => setShowStarterPrompt(false)}
                  className="py-1.5 px-2.5 rounded-lg border border-transparent text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all"
                >
                  Blank
                </button>
              </div>
            </div>
          )}

          {/* UI Overlay Layer */}
          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col">
            {/* Top Bar */}
            <div className="pointer-events-auto">
              <TopBar editor={editor} />
              <StyleBar editor={editor} />
            </div>
            
            <div className="flex-1 relative flex">
              {/* Left Toolbar */}
              <div className="pointer-events-auto">
                <Toolbar editor={editor} />
              </div>

              {/* Context Layer Panel */}
              <div className="pointer-events-auto">
                <ContextPanel />
              </div>

              {/* Right AI Panel (Opened intentionally via TopBar or shortcut) */}
              <div className="pointer-events-auto">
                <AiPanel editor={editor} />
              </div>

              {/* Bottom Replay Control */}
              <div className="pointer-events-auto">
                <TimeTravelReplay editor={editor} />
              </div>

              {/* Bottom Left Undo/Redo Controls */}
              <div className="pointer-events-auto">
                <UndoRedo editor={editor} />
              </div>

              {/* Bottom Right Zoom Controls */}
              <div className="pointer-events-auto">
                <ZoomControls editor={editor} />
              </div>
            </div>

            {/* Context Badges Layer */}
            <ContextBadges editor={editor} />

            {/* Presence Layer */}
            <PresenceCursors editor={editor} />
          </div>
        </div>
      </ErrorBoundary>
    </LiveblocksProvider>
  );
}
