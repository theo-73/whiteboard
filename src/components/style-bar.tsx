'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Editor, 
  DefaultColorStyle, 
  DefaultDashStyle, 
  DefaultFillStyle 
} from 'tldraw';
import { Trash2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiSounds } from '@/lib/use-ui-sounds';

interface StyleBarProps {
  editor?: Editor | null;
}

type ColorStyleValue = 'violet' | 'blue' | 'green' | 'yellow' | 'red' | 'grey' | 'black';
type FillStyleValue = 'none' | 'semi' | 'solid' | 'pattern';
type DashStyleValue = 'draw' | 'solid' | 'dashed';

const COLOR_OPTIONS: Array<{ value: ColorStyleValue; label: string; bg: string }> = [
  { value: 'violet', label: 'Violet', bg: '#8b5cf6' },
  { value: 'blue', label: 'Blue', bg: '#3b82f6' },
  { value: 'green', label: 'Green', bg: '#10b981' },
  { value: 'yellow', label: 'Yellow', bg: '#f59e0b' },
  { value: 'red', label: 'Red', bg: '#ef4444' },
  { value: 'grey', label: 'Grey', bg: '#6b7280' },
  { value: 'black', label: 'Dark', bg: '#181825' },
];

const FILL_OPTIONS: Array<{ value: FillStyleValue; label: string }> = [
  { value: 'none', label: 'Outline' },
  { value: 'semi', label: 'Tint' },
  { value: 'solid', label: 'Solid' },
  { value: 'pattern', label: 'Pattern' },
];

const DASH_OPTIONS: Array<{ value: DashStyleValue; label: string }> = [
  { value: 'draw', label: 'Hand' },
  { value: 'solid', label: 'Clean' },
  { value: 'dashed', label: 'Dash' },
];

export function StyleBar({ editor }: StyleBarProps) {
  const [selectedCount, setSelectedCount] = useState(0);
  const [currentColor, setCurrentColor] = useState<ColorStyleValue>('violet');
  const [currentFill, setCurrentFill] = useState<FillStyleValue>('semi');
  const [currentDash, setCurrentDash] = useState<DashStyleValue>('draw');
  const { playClick, playHover } = useUiSounds();

  // Listen to shape selection and style changes
  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      const selected = editor.getSelectedShapes();
      setSelectedCount(selected.length);

      if (selected.length > 0) {
        const color = editor.getStyleForNextShape(DefaultColorStyle);
        const fill = editor.getStyleForNextShape(DefaultFillStyle);
        const dash = editor.getStyleForNextShape(DefaultDashStyle);

        if (color) setCurrentColor(color as ColorStyleValue);
        if (fill) setCurrentFill(fill as FillStyleValue);
        if (dash) setCurrentDash(dash as DashStyleValue);
      }
    };

    updateSelection();
    const unlisten = editor.store.listen(updateSelection, { scope: 'session' });
    return () => unlisten();
  }, [editor]);

  const handleSetColor = useCallback((color: ColorStyleValue) => {
    playClick();
    setCurrentColor(color);
    if (!editor) return;
    editor.markHistoryStoppingPoint();
    if (editor.getSelectedShapes().length > 0) {
      editor.setStyleForSelectedShapes(DefaultColorStyle, color);
    }
    editor.setStyleForNextShapes(DefaultColorStyle, color);
  }, [editor, playClick]);

  const handleSetFill = useCallback((fill: FillStyleValue) => {
    playClick();
    setCurrentFill(fill);
    if (!editor) return;
    editor.markHistoryStoppingPoint();
    if (editor.getSelectedShapes().length > 0) {
      editor.setStyleForSelectedShapes(DefaultFillStyle, fill);
    }
    editor.setStyleForNextShapes(DefaultFillStyle, fill);
  }, [editor, playClick]);

  const handleSetDash = useCallback((dash: DashStyleValue) => {
    playClick();
    setCurrentDash(dash);
    if (!editor) return;
    editor.markHistoryStoppingPoint();
    if (editor.getSelectedShapes().length > 0) {
      editor.setStyleForSelectedShapes(DefaultDashStyle, dash);
    }
    editor.setStyleForNextShapes(DefaultDashStyle, dash);
  }, [editor, playClick]);

  const handleDeleteSelected = useCallback(() => {
    playClick();
    if (!editor) return;
    editor.markHistoryStoppingPoint();
    editor.deleteShapes(editor.getSelectedShapeIds());
  }, [editor, playClick]);

  const handleDuplicateSelected = useCallback(() => {
    playClick();
    if (!editor) return;
    const selectedIds = editor.getSelectedShapeIds();
    if (selectedIds.length === 0) return;
    editor.markHistoryStoppingPoint();
    editor.duplicateShapes(selectedIds);
  }, [editor, playClick]);

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-1.5 glass rounded-2xl border shadow-2xl backdrop-blur-xl max-w-[95vw] overflow-x-auto"
          style={{ borderColor: 'var(--border)' }}
          role="toolbar"
          aria-label="Shape Styling Toolbar"
        >
          {/* COLOR PALETTE */}
          <div className="flex items-center gap-1.5 px-1">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => handleSetColor(c.value)}
                onMouseEnter={playHover}
                aria-label={`Set color ${c.label}`}
                title={c.label}
                className={`w-6 h-6 rounded-full transition-transform active:scale-90 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                  currentColor === c.value ? 'ring-2 ring-white scale-110 shadow-md' : 'opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.bg }}
              />
            ))}
          </div>

          <div className="w-px h-5 bg-white/10 mx-0.5" />

          {/* FILL STYLE SELECTOR */}
          <div className="flex items-center gap-1">
            {FILL_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleSetFill(f.value)}
                onMouseEnter={playHover}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                  currentFill === f.value
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-white/10 mx-0.5" />

          {/* DASH STYLE SELECTOR */}
          <div className="flex items-center gap-1">
            {DASH_OPTIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => handleSetDash(d.value)}
                onMouseEnter={playHover}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                  currentDash === d.value
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-white/10 mx-0.5" />

          {/* ACTION BUTTONS: DUPLICATE & DELETE */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleDuplicateSelected}
              onMouseEnter={playHover}
              title="Duplicate (Ctrl+D)"
              aria-label="Duplicate selected shapes"
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <Copy size={15} />
            </button>
            <button
              onClick={handleDeleteSelected}
              onMouseEnter={playHover}
              title="Delete (Backspace)"
              aria-label="Delete selected shapes"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
