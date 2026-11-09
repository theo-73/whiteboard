'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, History, X } from 'lucide-react';
import { Editor } from 'tldraw';
import { useAppStore } from '@/store/app-store';

interface TimeTravelReplayProps {
  editor: Editor | null;
}

interface CanvasSnapshot {
  timestamp: number;
  shapes: Array<Record<string, unknown>>;
}

export function TimeTravelReplay({ editor }: TimeTravelReplayProps) {
  const [history, setHistory] = useState<CanvasSnapshot[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const liveSnapshotRef = useRef<Array<Record<string, unknown>> | null>(null);

  // Subscribe to editor shape changes to build history steps
  useEffect(() => {
    if (!editor) return;

    const unlisten = editor.store.listen(
      () => {
        if (isReplaying) return; // Don't record history while scrubbing replay

        const currentShapes = Array.from(editor.getCurrentPageShapes()).map((s) => ({
          id: s.id,
          type: s.type,
          x: s.x,
          y: s.y,
          rotation: s.rotation,
          parentId: s.parentId,
          index: s.index,
          isLocked: s.isLocked,
          opacity: s.opacity,
          meta: s.meta,
          props: s.props,
        }));

        setHistory((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            if (JSON.stringify(last.shapes) === JSON.stringify(currentShapes)) {
              return prev;
            }
          }
          const updated = [...prev, { timestamp: Date.now(), shapes: currentShapes }];
          return updated.slice(-50); // Keep last 50 steps
        });
      },
      { scope: 'document', source: 'user' }
    );

    return () => {
      unlisten();
      useAppStore.getState().setIsReplaying(false);
    };
  }, [editor, isReplaying]);

  const loadSnapshotStep = useCallback(
    (stepIndex: number) => {
      if (!editor || history.length === 0) return;
      const targetStep = Math.max(0, Math.min(stepIndex, history.length - 1));
      setCurrentStep(targetStep);

      const snapshot = history[targetStep];
      if (!snapshot) return;

      try {
        editor.store.mergeRemoteChanges(() => {
          const currentShapeIds = Array.from(editor.getCurrentPageShapeIds());
          if (currentShapeIds.length > 0) {
            editor.deleteShapes(currentShapeIds);
          }
          if (snapshot.shapes.length > 0) {
            editor.createShapes(snapshot.shapes as unknown as Parameters<typeof editor.createShapes>[0]);
          }
        });
      } catch (err) {
        console.error('Error applying snapshot step:', err);
      }
    },
    [editor, history]
  );

  const handleStartReplay = () => {
    if (!editor || history.length === 0) return;
    
    // Store current live snapshot before scrubbing
    liveSnapshotRef.current = Array.from(editor.getCurrentPageShapes()).map((s) => ({
      id: s.id,
      type: s.type,
      x: s.x,
      y: s.y,
      rotation: s.rotation,
      parentId: s.parentId,
      index: s.index,
      isLocked: s.isLocked,
      opacity: s.opacity,
      meta: s.meta,
      props: s.props,
    }));

    useAppStore.getState().setIsReplaying(true);
    setIsReplaying(true);
    setCurrentStep(0);
    loadSnapshotStep(0);
  };

  const handleExitReplay = () => {
    setIsPlaying(false);
    if (playTimerRef.current) clearInterval(playTimerRef.current);

    // Restore live state: pull from live multiplayer records if available, otherwise restore captured snapshot
    if (editor) {
      try {
        const getLiveRecords = useAppStore.getState().getLiveRecords;
        const liveRecords = getLiveRecords ? (getLiveRecords() as Array<{ id: string; typeName: string }>) : null;

        editor.store.mergeRemoteChanges(() => {
          const currentShapeIds = Array.from(editor.getCurrentPageShapeIds());
          if (currentShapeIds.length > 0) {
            editor.deleteShapes(currentShapeIds);
          }

          if (liveRecords && liveRecords.length > 0) {
            editor.store.put(liveRecords as Parameters<typeof editor.store.put>[0]);
          } else if (liveSnapshotRef.current && liveSnapshotRef.current.length > 0) {
            editor.createShapes(liveSnapshotRef.current as unknown as Parameters<typeof editor.createShapes>[0]);
          }
        });
        editor.markHistoryStoppingPoint();
      } catch (err) {
        console.error('Error restoring live snapshot:', err);
      }
    }

    setIsReplaying(false);
    useAppStore.getState().setIsReplaying(false);
  };

  // Playback timer loop
  useEffect(() => {
    if (isPlaying && isReplaying) {
      playTimerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= history.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          const next = prev + 1;
          loadSnapshotStep(next);
          return next;
        });
      }, 800);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, isReplaying, history.length, loadSnapshotStep]);

  if (!isReplaying) {
    return (
      <button
        onClick={handleStartReplay}
        disabled={history.length === 0}
        className="tooltip fixed bottom-16 left-24 md:bottom-4 md:left-24 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium glass border hover:bg-white/10 transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        aria-label="Replay step-by-step diagram evolution"
        data-tooltip="Replay step-by-step diagram evolution"
      >
        <History size={14} className="text-purple-400" />
        Time-Travel ({history.length} steps)
      </button>
    );
  }

  return (
    <div 
      className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-50 glass px-4 md:px-5 py-2.5 md:py-3 rounded-2xl border shadow-2xl flex items-center gap-2 md:gap-4 animate-slide-up max-w-[95vw] md:max-w-none"
      style={{ borderColor: 'var(--border)', minWidth: 'min(95vw, 420px)' }}
    >
      <div className="flex items-center gap-2">
        <History size={16} className="text-purple-400 animate-spin-slow" />
        <span className="text-xs font-semibold text-purple-300">Replay Mode</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => loadSnapshotStep(currentStep - 1)}
          disabled={currentStep <= 0}
          aria-label="Previous step"
          className="p-1.5 rounded hover:bg-white/10 disabled:opacity-40 text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <SkipBack size={14} />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? "Pause replay" : "Play replay"}
          className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <button
          onClick={() => loadSnapshotStep(currentStep + 1)}
          disabled={currentStep >= history.length - 1}
          aria-label="Next step"
          className="p-1.5 rounded hover:bg-white/10 disabled:opacity-40 text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          <SkipForward size={14} />
        </button>
      </div>

      {/* Scrubbing Slider */}
      <div className="flex-1 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={Math.max(0, history.length - 1)}
          value={currentStep}
          onChange={(e) => loadSnapshotStep(parseInt(e.target.value, 10))}
          aria-label="Replay timeline scrubber"
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        />
        <span className="text-[11px] font-mono text-gray-300 whitespace-nowrap">
          {currentStep + 1}/{history.length}
        </span>
      </div>

      <button
        onClick={handleExitReplay}
        aria-label="Exit Replay"
        data-tooltip="Exit Replay"
        className="tooltip p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
      >
        <X size={16} />
      </button>
    </div>
  );
}
