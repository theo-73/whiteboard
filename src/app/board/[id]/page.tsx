"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useContextStore } from "@/store/context-store";
import { Editor } from "tldraw";

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
  const id = params.id as string;
  
  const setCurrentRoom = useAppStore((state) => state.setCurrentRoom);
  const { setRoomId, openContextPanel } = useContextStore();
  
  const [editor, setEditor] = useState<Editor | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);
  const [roomLoaded, setRoomLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch room metadata & snapshot on mount
  useEffect(() => {
    if (id) {
      setRoomId(id);
      fetch(`/api/rooms/${id}`)
        .then((res) => res.json())
        .then((data) => {
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
          } else {
            setCurrentRoom({
              id,
              name: `Room ${id.substring(0, 4)}`,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        })
        .catch((err) => {
          console.warn("Failed to load room from API:", err);
          setCurrentRoom({
            id,
            name: `Room ${id.substring(0, 4)}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        })
        .finally(() => setRoomLoaded(true));
    }
  }, [id, setCurrentRoom, setRoomId]);

  // Debounced Auto-Save of Canvas Snapshot
  useEffect(() => {
    if (!editor || !id) return;

    const unlisten = editor.store.listen(
      () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
          try {
            const allRecords = editor.store.allRecords();
            const documentRecords = allRecords.filter(
              (r) => r.typeName === 'shape' || r.typeName === 'binding' || r.typeName === 'asset'
            );
            if (documentRecords.length > 0) {
              fetch(`/api/rooms/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ snapshotData: JSON.stringify(documentRecords) }),
              }).catch((e) => console.warn("Snapshot auto-save error:", e));
            }
          } catch (err) {
            console.warn("Error serializing snapshot:", err);
          }
        }, 2000);
      },
      { scope: "document", source: "user" }
    );

    return () => {
      unlisten();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editor, id]);

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
          // Update active shape metadata if panel is already open; do not forcibly auto-open on selection
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

  return (
    <LiveblocksProvider roomId={id || "default-room"}>
      <ErrorBoundary
        fallback={
          <div className="w-screen h-screen flex items-center justify-center bg-[var(--background)] text-[var(--text-primary)]">
            <div className="glass rounded-xl p-6 text-center max-w-md">
              <h3 className="text-lg font-bold mb-2">Board Error</h3>
              <p className="text-sm text-gray-400 mb-4">Failed to load the whiteboard. Please try refreshing.</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-500"
              >
                Refresh Page
              </button>
            </div>
          </div>
        }
      >
        <div className="w-screen h-screen overflow-hidden relative bg-[var(--background)] text-[var(--foreground)]">
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

              {/* Right AI Panel (Fixed container with AnimatePresence exit animations) */}
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
