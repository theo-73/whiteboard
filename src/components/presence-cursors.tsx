'use client';

import React, { useEffect, useState } from 'react';
import { useOthers, useUpdateMyPresence } from '@liveblocks/react';
import { useAppStore } from '@/store/app-store';
import { Editor } from 'tldraw';

interface UserPresence {
  cursor?: { x: number; y: number } | null;
  name?: string;
  color?: string;
}

interface PresenceCursorsProps {
  editor?: Editor | null;
}

export function PresenceCursors({ editor }: PresenceCursorsProps) {
  const updateMyPresence = useUpdateMyPresence();
  const others = useOthers((users) =>
    users.map((user) => {
      const p = (user.presence || {}) as Record<string, unknown>;
      const cursor = (p.cursor && typeof p.cursor === 'object') ? (p.cursor as { x: number; y: number }) : null;
      const name = typeof p.name === 'string' ? p.name : undefined;
      const color = typeof p.color === 'string' ? p.color : undefined;
      const presence: UserPresence = { cursor, name, color };
      return {
        connectionId: user.connectionId,
        presence,
      };
    })
  );
  const { currentUser, followingUserId, setConnectedUsers } = useAppStore();
  const [, setCameraTick] = useState(0);

  // Sync real active Liveblocks peers to global store
  useEffect(() => {
    const peers = others.map((u) => ({
      id: u.connectionId.toString(),
      name: u.presence?.name || `Collaborator ${u.connectionId}`,
      color: u.presence?.color || '#3b82f6',
    }));
    setConnectedUsers(peers);
  }, [others, setConnectedUsers]);

  // Re-render cursors when viewport camera pans or zooms
  useEffect(() => {
    if (!editor) return;
    const unlisten = editor.store.listen(() => setCameraTick((t) => t + 1), {
      scope: 'session',
    });
    return () => unlisten();
  }, [editor]);

  // Broadcast cursor in canvas page coordinates
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      let pagePos: { x: number; y: number } | null = null;
      if (editor) {
        try {
          const pt = editor.screenToPage({ x: e.clientX, y: e.clientY });
          pagePos = { x: pt.x, y: pt.y };
        } catch {
          pagePos = { x: e.clientX, y: e.clientY };
        }
      } else {
        pagePos = { x: e.clientX, y: e.clientY };
      }

      updateMyPresence({
        cursor: pagePos,
        name: currentUser.name,
        color: currentUser.color,
      });
    };

    const handlePointerLeave = () => {
      updateMyPresence({ cursor: null });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [updateMyPresence, currentUser, editor]);

  // Live Camera Follow Mode (centered in canvas world coordinates)
  useEffect(() => {
    if (!editor || !followingUserId) return;

    const followedTarget = others.find(
      (o) =>
        o.connectionId.toString() === followingUserId ||
        o.presence?.name?.toLowerCase() === followingUserId.toLowerCase()
    );

    if (followedTarget?.presence?.cursor) {
      const { x, y } = followedTarget.presence.cursor;
      try {
        editor.centerOnPoint({ x, y });
      } catch {
        // ignore
      }
    }
  }, [editor, followingUserId, others]);

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      {others.map(({ connectionId, presence }) => {
        if (!presence?.cursor) return null;

        // Project canvas page coordinates to current viewport
        let screenX = presence.cursor.x;
        let screenY = presence.cursor.y;

        if (editor) {
          try {
            const vp = editor.pageToViewport(presence.cursor);
            screenX = vp.x;
            screenY = vp.y;
          } catch {
            // fallback to raw coordinates
          }
        }

        const color = presence.color || '#3b82f6';
        const name = presence.name || 'Collaborator';

        return (
          <div
            key={connectionId}
            className="absolute top-0 left-0 transition-transform duration-75 ease-out"
            style={{
              transform: `translate3d(${Math.round(screenX)}px, ${Math.round(screenY)}px, 0)`,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill={color}
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-md"
              style={{ transform: 'rotate(-15deg)' }}
            >
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              <path d="M13 13l6 6" />
            </svg>

            <div
              className="mt-1 px-2 py-0.5 rounded-full text-white text-[10px] font-medium shadow-sm whitespace-nowrap"
              style={{ backgroundColor: color }}
            >
              {name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
