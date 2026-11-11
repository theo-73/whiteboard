'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Editor } from 'tldraw';
import { useContextStore } from '@/store/context-store';
import { FileText, Link as LinkIcon, Code2, Paperclip } from 'lucide-react';

interface ContextBadgesProps {
  editor?: Editor | null;
}

interface BadgePosition {
  shapeId: string;
  shapeLabel: string;
  pageX: number;
  pageY: number;
  x: number;
  y: number;
  notesCount: number;
  linksCount: number;
  codeCount: number;
  filesCount: number;
  totalCount: number;
}

export function ContextBadges({ editor }: ContextBadgesProps) {
  const { contexts, openContextPanel } = useContextStore();
  const [badges, setBadges] = useState<BadgePosition[]>([]);
  const badgeElementsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const badgesRef = useRef<BadgePosition[]>([]);

  const syncBadgeDomTransforms = useCallback(() => {
    if (!editor) return;
    badgesRef.current.forEach((b: BadgePosition) => {
      const el = badgeElementsRef.current.get(b.shapeId);
      if (el) {
        try {
          const screenPos = editor.pageToViewport({ x: b.pageX, y: b.pageY });
          el.style.transform = `translate3d(${screenPos.x}px, ${screenPos.y}px, 0)`;
        } catch {
          // ignore
        }
      }
    });
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const updateBadges = () => {
      const pageShapes = Array.from(editor.getCurrentPageShapes());
      const newBadges: BadgePosition[] = [];

      pageShapes.forEach((s) => {
        const shapeIdStr = s.id.toString();
        const ctx = contexts[shapeIdStr];

        if (!ctx) return;

        const notesCount = ctx.notes?.trim() ? 1 : 0;
        const linksCount = ctx.links?.length || 0;
        const codeCount = ctx.codeSnippets?.length || 0;
        const filesCount = ctx.files?.length || 0;
        const totalCount = notesCount + linksCount + codeCount + filesCount;

        if (totalCount === 0) return;

        const bounds = editor.getShapePageBounds(s.id);
        const props = (s.props || {}) as { text?: string; w?: number };
        const label = props.text?.trim() || (s.type === 'text' ? 'Text' : 'Component');

        // Calculate top right of shape in page coordinates using true bounds
        const pageX = bounds ? bounds.maxX - 12 : s.x + (props.w || 160) - 12;
        const pageY = bounds ? bounds.minY - 12 : s.y - 12;

        try {
          const screenPos = editor.pageToViewport({ x: pageX, y: pageY });

          newBadges.push({
            shapeId: shapeIdStr,
            shapeLabel: label,
            pageX,
            pageY,
            x: screenPos.x,
            y: screenPos.y,
            notesCount,
            linksCount,
            codeCount,
            filesCount,
            totalCount,
          });
        } catch {
          // ignore off-screen or uncomputed positions
        }
      });

      badgesRef.current = newBadges;
      setBadges(newBadges);
      syncBadgeDomTransforms();
    };

    updateBadges();

    const unlisten = editor.store.listen(() => {
      syncBadgeDomTransforms();
      updateBadges();
    }, { scope: 'all' });

    return () => {
      unlisten();
    };
  }, [editor, contexts, syncBadgeDomTransforms]);

  if (!editor || badges.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {badges.map((b) => (
        <button
          key={b.shapeId}
          ref={(el) => {
            if (el) badgeElementsRef.current.set(b.shapeId, el);
            else badgeElementsRef.current.delete(b.shapeId);
          }}
          onClick={(e) => {
            e.stopPropagation();
            openContextPanel(b.shapeId, b.shapeLabel);
          }}
          className="pointer-events-auto absolute top-0 left-0 flex items-center gap-1 px-2 py-1 rounded-full bg-blue-600/90 hover:bg-blue-500 text-white text-[11px] font-bold shadow-lg border border-blue-400/40 backdrop-blur-md transition-all duration-150 hover:scale-105 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          style={{
            transform: `translate3d(${b.x}px, ${b.y}px, 0)`,
          }}
          aria-label={`Context Layer: ${b.totalCount} attachments. Click to view.`}
        >
          {b.filesCount > 0 ? (
            <Paperclip size={12} className="text-blue-200" />
          ) : b.codeCount > 0 ? (
            <Code2 size={12} className="text-green-300" />
          ) : b.linksCount > 0 ? (
            <LinkIcon size={12} className="text-blue-300" />
          ) : (
            <FileText size={12} className="text-amber-300" />
          )}

          <span className="leading-none">{b.totalCount}</span>

          {/* Hover Tooltip */}
          <div 
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity pointer-events-none z-50 bg-black/90 text-white border border-white/20 shadow-xl backdrop-blur-md"
            aria-hidden="true"
          >
            <span className="font-semibold text-blue-300">{b.shapeLabel}</span>
            <div className="flex items-center gap-2 mt-0.5 text-gray-300">
              {b.notesCount > 0 && <span>• Notes</span>}
              {b.linksCount > 0 && <span>• {b.linksCount} Links</span>}
              {b.codeCount > 0 && <span>• {b.codeCount} Snippets</span>}
              {b.filesCount > 0 && <span>• {b.filesCount} Files</span>}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
