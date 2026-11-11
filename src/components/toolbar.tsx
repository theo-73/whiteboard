'use client';

import React, { useState, useEffect } from 'react';
import { 
  MousePointer2, 
  Hand, 
  Pen, 
  Square, 
  Circle, 
  ArrowUpRight, 
  Type, 
  Eraser, 
  Sparkles,
  Wand2,
  FileText,
  LucideIcon,
  PenTool
} from 'lucide-react';
import { useAppStore, Tool } from '@/store/app-store';
import { useContextStore } from '@/store/context-store';
import { executeMessCleanup } from '@/lib/auto-layout';
import { motion, type Variants } from 'framer-motion';
import { useUiSounds } from '@/lib/use-ui-sounds';

import { Editor, GeoShapeGeoStyle } from 'tldraw';

interface ToolbarProps {
  editor?: Editor | null;
}

const tools: { id: Tool; icon: LucideIcon; label: string; shortcut: string }[] = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'hand', icon: Hand, label: 'Hand', shortcut: 'H' },
  { id: 'draw', icon: Pen, label: 'Draw', shortcut: 'D' },
  { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse', shortcut: 'O' },
  { id: 'arrow', icon: ArrowUpRight, label: 'Arrow', shortcut: 'A' },
  { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
  { id: 'eraser', icon: Eraser, label: 'Eraser', shortcut: 'E' },
];

const containerVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
      staggerChildren: 0.05,
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 20 }
  }
};

export function Toolbar({ editor }: ToolbarProps) {
  const { activeTool, setActiveTool, aiPanelOpen, toggleAiPanel } = useAppStore();
  const { isContextPanelOpen, openContextPanel, closeContextPanel } = useContextStore();
  const [cleanedCount, setCleanedCount] = useState<number | null>(null);
  const [convertingSketch, setConvertingSketch] = useState(false);
  const { playClick, playHover, playSuccess } = useUiSounds();

  // Sync toolbar active state with native tldraw hotkeys (v, d, r, e, etc.)
  useEffect(() => {
    if (!editor) return;

    const updateActiveTool = () => {
      const currentToolId = editor.getCurrentToolId();
      let targetTool: Tool | undefined;

      if (currentToolId === 'geo') {
        const geoStyle = editor.getStyleForNextShape(GeoShapeGeoStyle);
        targetTool = geoStyle === 'ellipse' ? 'ellipse' : 'rectangle';
      } else {
        const toolMap: Record<string, Tool> = {
          select: 'select',
          hand: 'hand',
          draw: 'draw',
          arrow: 'arrow',
          text: 'text',
          eraser: 'eraser',
        };
        targetTool = toolMap[currentToolId];
      }

      if (targetTool && targetTool !== activeTool) {
        setActiveTool(targetTool);
      }
    };

    const unlisten = editor.store.listen(updateActiveTool, { scope: 'session' });
    return () => unlisten();
  }, [editor, activeTool, setActiveTool]);

  const handleToolSelect = (toolId: Tool) => {
    playClick();
    setActiveTool(toolId);
    if (!editor) return;

    switch (toolId) {
      case 'select':
        editor.setCurrentTool('select');
        break;
      case 'hand':
        editor.setCurrentTool('hand');
        break;
      case 'draw':
        editor.setCurrentTool('draw');
        break;
      case 'rectangle':
        editor.setStyleForNextShapes(GeoShapeGeoStyle, 'rectangle');
        editor.setCurrentTool('geo');
        break;
      case 'ellipse':
        editor.setStyleForNextShapes(GeoShapeGeoStyle, 'ellipse');
        editor.setCurrentTool('geo');
        break;
      case 'arrow':
        editor.setCurrentTool('arrow');
        break;
      case 'text':
        editor.setCurrentTool('text');
        break;
      case 'eraser':
        editor.setCurrentTool('eraser');
        break;
    }
  };

  const handleMessCleanup = async () => {
    if (!editor) return;
    playClick();
    const count = await executeMessCleanup(editor);
    setCleanedCount(count);
    if (count > 0) playSuccess();
    setTimeout(() => setCleanedCount(null), 2000);
  };

  const handleConvertFreehandSketch = async () => {
    if (!editor || convertingSketch) return;
    playClick();

    const selectedShapes = Array.from(editor.getSelectedShapes());
    let targetDrawShapes = selectedShapes.filter((s) => s.type === 'draw');

    if (targetDrawShapes.length === 0) {
      targetDrawShapes = Array.from(editor.getCurrentPageShapes()).filter((s) => s.type === 'draw');
    }

    if (targetDrawShapes.length === 0) {
      handleToolSelect('draw');
      return;
    }

    setConvertingSketch(true);
    try {
      const strokes = targetDrawShapes.map((shape) => {
        const props = shape.props as {
          segments?: Array<{ points?: Array<{ x: number; y: number }> }>;
        };
        const points: Array<[number, number]> = [];
        (props.segments || []).forEach((seg) => {
          (seg.points || []).forEach((pt) => {
            points.push([Math.round(shape.x + pt.x), Math.round(shape.y + pt.y)]);
          });
        });
        return { id: shape.id.toString(), points };
      });

      const res = await fetch('/api/ai/sketch-to-diagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strokes }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.shapes && data.shapes.length > 0) {
          editor.deleteShapes(targetDrawShapes.map((s) => s.id));
          editor.createShapes(data.shapes);
          playSuccess();
        }
      }
    } catch (err) {
      console.error('Failed to convert sketch:', err);
    } finally {
      setConvertingSketch(false);
    }
  };

  const handleToggleContext = () => {
    playClick();
    if (isContextPanelOpen) {
      closeContextPanel();
    } else {
      if (!editor) return;
      const selectedShapes = Array.from(editor.getSelectedShapes());
      if (selectedShapes.length > 0) {
        const first = selectedShapes[0];
        const label = (first.props as { text?: string })?.text || 'Selected Component';
        openContextPanel(first.id.toString(), label);
      } else {
        openContextPanel('global-board-notes', 'Board Main Notes');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(e.currentTarget.querySelectorAll('button')) as HTMLElement[];
    const index = buttons.indexOf(e.target as HTMLElement);
    
    if (index === -1) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % buttons.length;
      buttons[nextIndex].focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const nextIndex = (index - 1 + buttons.length) % buttons.length;
      buttons[nextIndex].focus();
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="toolbar"
      aria-orientation="vertical"
      aria-label="Canvas Tools"
      onKeyDown={handleKeyDown}
      className="fixed bottom-3 left-1/2 -translate-x-1/2 md:bottom-auto md:left-4 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 flex flex-row md:flex-col gap-1 md:gap-2 p-1.5 md:p-2 glass z-50 max-w-[96vw] md:max-w-none overflow-x-auto md:overflow-visible border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] select-none backdrop-blur-xl"
      style={{ borderRadius: 'var(--radius-xl)' }}
    >
      {tools.map((tool) => (
        <motion.button
          variants={itemVariants}
          key={tool.id}
          onClick={() => handleToolSelect(tool.id)}
          onMouseEnter={playHover}
          aria-label={`${tool.label} (${tool.shortcut})`}
          className={`relative group w-9 h-9 md:w-10 md:h-10 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl transition-all duration-150 flex-shrink-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
            activeTool === tool.id 
              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm' 
              : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <tool.icon size={17} className="md:w-5 md:h-5 transition-transform" />
          
          <div 
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:left-full md:top-1/2 md:-translate-y-1/2 md:translate-x-0 md:ml-3 px-2.5 py-1 text-xs whitespace-nowrap rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity z-50 glass font-medium shadow-xl border border-white/10 text-gray-200 flex items-center gap-1.5"
            aria-hidden="true"
          >
            <span>{tool.label}</span>
            <kbd className="px-1 py-0.5 rounded bg-white/15 text-[10px] font-mono text-blue-200">{tool.shortcut}</kbd>
          </div>
        </motion.button>
      ))}

      <motion.div variants={itemVariants} className="hidden md:block w-full h-px my-1 bg-white/10" />
      <motion.div variants={itemVariants} className="block md:hidden w-px h-6 my-auto mx-0.5 bg-white/10 flex-shrink-0" />

      {/* MESS CLEANUP BUTTON */}
      <motion.button
        variants={itemVariants}
        onClick={handleMessCleanup}
        onMouseEnter={playHover}
        aria-label="Mess Cleanup — Auto-align diagram structure"
        className="relative group w-9 h-9 md:w-10 md:h-10 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl transition-all duration-150 flex-shrink-0 overflow-hidden bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 active:scale-95 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Wand2 size={18} className="text-amber-400 transition-transform" />
        
        {/* Tooltip */}
        <div 
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:left-full md:top-1/2 md:-translate-y-1/2 md:translate-x-0 md:ml-3 px-2.5 py-1 text-xs whitespace-nowrap rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity z-50 glass font-semibold text-amber-300 shadow-xl border border-amber-500/30"
          aria-hidden="true"
        >
          {cleanedCount !== null ? `Aligned ${cleanedCount} shapes!` : 'Mess Cleanup (Auto-Align)'}
        </div>
      </motion.button>

      {/* FREEHAND SKETCH TO STRUCTURED DIAGRAM BUTTON */}
      <motion.button
        variants={itemVariants}
        onClick={handleConvertFreehandSketch}
        onMouseEnter={playHover}
        aria-label="Magic Sketch — Convert rough drawings into clean architecture shapes"
        className={`relative group w-9 h-9 md:w-10 md:h-10 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl transition-all duration-150 flex-shrink-0 overflow-hidden bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 active:scale-95 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
          convertingSketch ? 'animate-pulse' : ''
        }`}
      >
        <PenTool size={18} className={`text-sky-400 transition-transform ${convertingSketch ? 'animate-spin' : ''}`} />
        
        {/* Tooltip */}
        <div 
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:left-full md:top-1/2 md:-translate-y-1/2 md:translate-x-0 md:ml-3 px-2.5 py-1 text-xs whitespace-nowrap rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity z-50 glass font-semibold text-sky-300 shadow-xl border border-sky-500/30"
          aria-hidden="true"
        >
          {convertingSketch ? 'Converting Sketch...' : 'Magic Sketch (Convert Freehand)'}
        </div>
      </motion.button>

      {/* CONTEXT LAYER BUTTON */}
      <motion.button
        variants={itemVariants}
        onClick={handleToggleContext}
        onMouseEnter={playHover}
        aria-label="Context Layer — Attach Notes, Links, Code & Files"
        className={`relative group w-9 h-9 md:w-10 md:h-10 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl transition-all duration-150 flex-shrink-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          isContextPanelOpen 
            ? 'bg-blue-600 text-white shadow-sm border border-blue-400/50' 
            : 'hover:bg-white/10 text-gray-300 border border-transparent'
        }`}
      >
        <FileText size={18} className={isContextPanelOpen ? 'text-white' : 'text-blue-400 transition-transform'} />
        
        {/* Tooltip */}
        <div 
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:left-full md:top-1/2 md:-translate-y-1/2 md:translate-x-0 md:ml-3 px-2.5 py-1 text-xs whitespace-nowrap rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity z-50 glass font-medium shadow-xl border border-white/10 text-gray-200"
          aria-hidden="true"
        >
          Context Layer (Notes/Links/Code)
        </div>
      </motion.button>

      <motion.div variants={itemVariants} className="hidden md:block w-full h-px my-1 bg-white/10" />
      <motion.div variants={itemVariants} className="block md:hidden w-px h-6 my-auto mx-0.5 bg-white/10 flex-shrink-0" />

      {/* AI COPILOT BUTTON */}
      <motion.button
        variants={itemVariants}
        onClick={() => { playClick(); toggleAiPanel(); }}
        onMouseEnter={playHover}
        aria-label="AI Architecture Assist"
        className={`relative group w-9 h-9 md:w-10 md:h-10 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl transition-all duration-150 flex-shrink-0 overflow-hidden active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          aiPanelOpen 
            ? 'bg-blue-600 text-white shadow-sm border border-blue-400/50' 
            : 'hover:bg-white/10 text-gray-300 border border-transparent'
        }`}
      >
        <Sparkles size={18} className="relative z-10 text-blue-300 transition-transform" />
        
        {/* Tooltip */}
        <div 
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:left-full md:top-1/2 md:-translate-y-1/2 md:translate-x-0 md:ml-3 px-2.5 py-1 text-xs whitespace-nowrap rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity z-50 glass font-medium shadow-xl border border-white/10 text-gray-200"
          aria-hidden="true"
        >
          AI Architecture Assist
        </div>
      </motion.button>
    </motion.div>
  );
}

