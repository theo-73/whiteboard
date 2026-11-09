"use client";

import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
import { useYjsStore } from "@/lib/use-yjs-store";
import { LoadingSpinner } from "./loading-spinner";

interface CanvasWrapperProps {
  roomId?: string;
  initialSnapshot?: string | null;
  onMount?: (editor: Editor) => void;
}

export default function CanvasWrapper({
  roomId = "default-room",
  initialSnapshot,
  onMount,
}: CanvasWrapperProps) {
  const { store, isSynced } = useYjsStore({ roomId, initialSnapshot });

  if (!isSynced) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <LoadingSpinner size="lg" text="Syncing collaborative canvas..." />
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Tldraw store={store} onMount={onMount} hideUi />
    </div>
  );
}
