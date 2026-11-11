'use client';

import React, { ReactNode } from 'react';
import {
  LiveblocksProvider as LiveblocksProviderBase,
  RoomProvider,
  ClientSideSuspense,
  RoomContext,
} from '@liveblocks/react';
import { LoadingSpinner } from './loading-spinner';

interface LiveblocksProviderProps {
  roomId: string;
  children: ReactNode;
}

const publicApiKey = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY;
const isLiveblocksConfigured = !!publicApiKey && publicApiKey !== 'pk_dev_placeholder_key' && publicApiKey.startsWith('pk_');

function createOfflineMockRoom(roomId: string) {
  return {
    id: roomId,
    subscribe: () => () => {},
    connect: () => {},
    disconnect: () => {},
    updatePresence: () => {},
    broadcastEvent: () => {},
    batch: (fn: () => void) => fn(),
    getStatus: () => 'initial',
    getSelf: () => null,
    getPresence: () => ({}),
    getOthers: () => [],
    events: { customEvent: { subscribe: () => () => {} } },
  };
}

export function LiveblocksProvider({ roomId, children }: LiveblocksProviderProps) {
  if (!isLiveblocksConfigured) {
    // Clean offline solo mode without 401 WebSocket reconnect loops
    const mockRoom = createOfflineMockRoom(roomId);
    return (
      // @ts-expect-error Upstream @liveblocks/react (v2.x) RoomContext expects an internal Liveblocks Room instance with private socket fields. In offline solo mode (when NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY is absent), this adapter satisfies consumer hooks (useRoom, useOthers, useMyPresence) without unauthenticated WebSocket reconnect loops.
      <RoomContext.Provider value={mockRoom}>
        {children}
      </RoomContext.Provider>
    );
  }

  return (
    <LiveblocksProviderBase publicApiKey={publicApiKey!}>
      <RoomProvider id={roomId} initialPresence={{ cursor: null, name: 'Anonymous' }}>
        <ClientSideSuspense fallback={
          <div className="w-full h-full flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
            <div className="flex flex-col items-center gap-3">
              <LoadingSpinner size="lg" text="Connecting to room..." />
            </div>
          </div>
        }>
          {() => children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProviderBase>
  );
}
