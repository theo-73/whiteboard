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
      className="fixed bottom-16 right-3 md:bottom-4 md:right-4 flex items-center glass p-1 z-40"
      style={{ borderRadius: '100px', border: '1px solid var(--border)' }}
    >
      <button 
        onClick={handleZoomOut}
        aria-label="Zoom out"
        data-tooltip="Zoom out"
        className="tooltip p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-gray-500 hover:text-gray-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Minus size={16} />
      </button>
      
      <div 
        className="px-2 text-xs font-medium min-w-[3rem] text-center"
        style={{ color: 'var(--text-primary)' }}
      >
        {zoom}%
      </div>
      
      <button 
        onClick={handleZoomIn}
        aria-label="Zoom in"
        data-tooltip="Zoom in"
        className="tooltip p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-gray-500 hover:text-gray-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Plus size={16} />
      </button>

      <div 
        className="w-px h-4 mx-1" 
        style={{ backgroundColor: 'var(--border)' }} 
      />
      
      <button 
        onClick={handleZoomFit}
        aria-label="Fit to screen"
        data-tooltip="Fit to screen"
        className="tooltip p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-gray-500 hover:text-gray-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Maximize2 size={16} />
      </button>
    </div>
  );
}
