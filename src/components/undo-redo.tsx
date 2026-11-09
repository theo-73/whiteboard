'use client';

import React, { useEffect, useCallback } from 'react';
import { Undo, Redo } from 'lucide-react';
import { Editor } from 'tldraw';
import { useAppStore } from '@/store/app-store';

interface UndoRedoProps {
  editor?: Editor | null;
}

export function UndoRedo({ editor }: UndoRedoProps) {
  const { canUndo, canRedo, setCanUndo, setCanRedo } = useAppStore();

  useEffect(() => {
    if (!editor) return;

    const updateUndoRedoState = () => {
      setCanUndo(editor.canUndo());
      setCanRedo(editor.canRedo());
    };

    // Initial state
    updateUndoRedoState();

    // Listen to store changes to update undo/redo state
    const unlisten = editor.store.listen(updateUndoRedoState, { scope: 'document' });

    return () => {
      unlisten();
    };
  }, [editor, setCanUndo, setCanRedo]);

  const handleUndo = useCallback(() => {
    if (editor && canUndo) {
      editor.undo();
    }
  }, [editor, canUndo]);

  const handleRedo = useCallback(() => {
    if (editor && canRedo) {
      editor.redo();
    }
  }, [editor, canRedo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  return (
    <div 
      className="fixed bottom-16 left-3 md:bottom-4 md:left-4 flex items-center glass p-1 z-40"
      style={{ borderRadius: '100px', border: '1px solid var(--border)' }}
    >
      <button 
        onClick={handleUndo}
        disabled={!canUndo}
        aria-label="Undo"
        data-tooltip="Undo (Ctrl+Z)"
        className="tooltip p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Undo size={16} />
      </button>
      
      <div 
        className="w-px h-4 mx-1" 
        style={{ backgroundColor: 'var(--border)' }} 
      />
      
      <button 
        onClick={handleRedo}
        disabled={!canRedo}
        aria-label="Redo"
        data-tooltip="Redo (Ctrl+Shift+Z)"
        className="tooltip p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Redo size={16} />
      </button>
    </div>
  );
}
