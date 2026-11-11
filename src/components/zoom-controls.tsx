import React, { useState, useEffect } from 'react';
import { Plus, Minus, Maximize2 } from 'lucide-react';
import { Editor } from 'tldraw';

interface ZoomControlsProps {
  editor?: Editor | null;
}

export function ZoomControls({ editor }: ZoomControlsProps) {
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (!editor) return;
    const updateZoom = () => {
      setZoom(Math.round(editor.getZoomLevel() * 100));
    };
    updateZoom();
    // listen to camera/zoom changes
    const unlisten = editor.store.listen(updateZoom, { scope: 'session' });
    return () => {
      unlisten();
    };
  }, [editor]);

  const handleZoomIn = () => {
    if (editor) {
      editor.zoomIn();
    } else {
      setZoom(prev => Math.min(prev + 10, 300));
    }
  };

  const handleZoomOut = () => {
    if (editor) {
      editor.zoomOut();
    } else {
      setZoom(prev => Math.max(prev - 10, 10));
    }
  };

  const handleZoomFit = () => {
    if (editor) {
      editor.zoomToFit();
    } else {
      setZoom(100);
    }
  };

  return (
    <div 
      className="fixed bottom-16 right-3 md:bottom-4 md:right-4 flex items-center glass p-1 z-40 select-none shadow-lg backdrop-blur-md"
      style={{ borderRadius: '100px', border: '1px solid var(--border)' }}
    >
      <button 
        onClick={handleZoomOut}
        aria-label="Zoom out"
        data-tooltip="Zoom out (-)"
        className="tooltip w-8 h-8 md:w-7 md:h-7 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all text-gray-400 hover:text-gray-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Minus size={15} />
      </button>
      
      <div 
        className="px-2 text-xs font-semibold min-w-[3.25rem] text-center font-mono tabular-nums tracking-tight select-none"
        style={{ color: 'var(--text-primary)' }}
      >
        {zoom}%
      </div>
      
      <button 
        onClick={handleZoomIn}
        aria-label="Zoom in"
        data-tooltip="Zoom in (+)"
        className="tooltip w-8 h-8 md:w-7 md:h-7 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all text-gray-400 hover:text-gray-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Plus size={15} />
      </button>

      <div 
        className="w-px h-4 mx-1" 
        style={{ backgroundColor: 'var(--border)' }} 
      />
      
      <button 
        onClick={handleZoomFit}
        aria-label="Fit to screen"
        data-tooltip="Fit to screen (Shift+1)"
        className="tooltip w-8 h-8 md:w-7 md:h-7 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all text-gray-400 hover:text-gray-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  );
}
