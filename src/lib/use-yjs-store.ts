'use client';

import { useEffect, useState } from 'react';
import { useRoom } from '@liveblocks/react';
import { LiveblocksYjsProvider } from '@liveblocks/yjs';
import * as Y from 'yjs';
import { createTLStore, defaultShapeUtils, TLRecord, TLStore } from 'tldraw';
import { useAppStore } from '@/store/app-store';

interface UseYjsStoreOptions {
  roomId?: string;
  initialSnapshot?: string | null;
}

export function useYjsStore({ initialSnapshot }: UseYjsStoreOptions = {}) {
  const room = useRoom();
  const [store] = useState<TLStore>(() =>
    createTLStore({ shapeUtils: defaultShapeUtils })
  );
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    let unmounted = false;
    const yDoc = new Y.Doc();
    let yProvider: LiveblocksYjsProvider | null = null;

    try {
      const isLiveRoom = Boolean(room && typeof room === 'object' && 'fetchYDoc' in room);
      if (isLiveRoom) {
        yProvider = new LiveblocksYjsProvider(room, yDoc);
      }
    } catch {
      // Running offline fallback
    }

    const yRecords = yDoc.getMap<TLRecord>('tldraw_records');
    useAppStore.getState().setGetLiveRecords(() => Array.from(yRecords.values()));

    // Subscribe to store changes made locally by the user and push to Yjs
    const unlistenStore = store.listen(
      (entry) => {
        if (entry.source !== 'user' || useAppStore.getState().isReplaying) return;

        yDoc.transact(() => {
          Object.values(entry.changes.added).forEach((record) => {
            if (
              record.typeName === 'shape' ||
              record.typeName === 'binding' ||
              record.typeName === 'asset'
            ) {
              yRecords.set(record.id, record);
            }
          });

          Object.values(entry.changes.updated).forEach(([, to]) => {
            if (
              to.typeName === 'shape' ||
              to.typeName === 'binding' ||
              to.typeName === 'asset'
            ) {
              yRecords.set(to.id, to);
            }
          });

          Object.values(entry.changes.removed).forEach((record) => {
            if (
              record.typeName === 'shape' ||
              record.typeName === 'binding' ||
              record.typeName === 'asset'
            ) {
              yRecords.delete(record.id);
            }
          });
        });
      },
      { scope: 'document', source: 'user' }
    );

    // Subscribe to Yjs changes from other collaborators and merge into local store
    const handleYRecordsChange = (event: Y.YMapEvent<TLRecord>) => {
      if (event.transaction.local) return;

      const toPut: TLRecord[] = [];
      const toRemove: TLRecord['id'][] = [];

      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          const rec = yRecords.get(key);
          if (rec) toPut.push(rec);
        } else if (change.action === 'delete') {
          toRemove.push(key as TLRecord['id']);
        }
      });

      store.mergeRemoteChanges(() => {
        if (toPut.length > 0) store.put(toPut);
        if (toRemove.length > 0) store.remove(toRemove);
      });
    };

    yRecords.observe(handleYRecordsChange);

    // Initial hydration
    const syncInitialRecords = () => {
      if (unmounted) return;

      if (yRecords.size > 0) {
        // Hydrate from existing shared document
        const records = Array.from(yRecords.values());
        store.mergeRemoteChanges(() => {
          store.put(records);
        });
      } else if (initialSnapshot) {
        // If shared room is blank, hydrate from persistent database snapshot
        try {
          const parsed = JSON.parse(initialSnapshot);
          if (Array.isArray(parsed) && parsed.length > 0) {
            yDoc.transact(() => {
              parsed.forEach((rec: TLRecord) => {
                if (
                  rec.typeName === 'shape' ||
                  rec.typeName === 'binding' ||
                  rec.typeName === 'asset'
                ) {
                  yRecords.set(rec.id, rec);
                }
              });
            });
            store.mergeRemoteChanges(() => {
              store.put(parsed);
            });
          }
        } catch (e) {
          console.warn('Failed to parse initial snapshot:', e);
        }
      }
      setIsSynced(true);
    };

    if (yProvider) {
      if (yProvider.rootDocHandler.synced) {
        syncInitialRecords();
      } else {
        const handleSync = () => {
          syncInitialRecords();
        };
        yProvider.rootDocHandler.on('synced', handleSync);

        // Fallback timeout in dev mode or offline
        const timer = setTimeout(syncInitialRecords, 800);

        return () => {
          unmounted = true;
          clearTimeout(timer);
          unlistenStore();
          yRecords.unobserve(handleYRecordsChange);
          yProvider?.rootDocHandler.off('synced', handleSync);
          yProvider?.destroy();
          yDoc.destroy();
        };
      }
    } else {
      syncInitialRecords();
    }

    return () => {
      unmounted = true;
      unlistenStore();
      yRecords.unobserve(handleYRecordsChange);
      yProvider?.destroy();
      yDoc.destroy();
    };
  }, [room, store, initialSnapshot]);

  return { store, isSynced };
}
