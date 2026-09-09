import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/**
 * Whether the browser thinks it has a connection.
 *
 * Reads TanStack Query's `onlineManager` rather than `navigator.onLine`
 * directly. The manager already listens to the browser's `online`/`offline`
 * events and seeds itself from `navigator.onLine`, and it is the same switch
 * that pauses queries and parks a live-scoring save. Asking it means the banner
 * and a queued round can never disagree about the moment the signal dropped.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect`: the value is read
 * during render, so there is no first paint that claims to be online before an
 * effect runs, and no `setState` inside an effect for the linter to object to.
 *
 * The browser's answer is optimistic. It reports a connection whenever a network
 * interface is up, so a captive portal or a dead uplink still reads as online.
 * That makes this reliable for "definitely offline" and not for "definitely
 * working", which is why nothing here blocks a request — it only explains one.
 */
const subscribe = (onChange: () => void): (() => void) => onlineManager.subscribe(onChange);

const getSnapshot = (): boolean => onlineManager.isOnline();

/** A server render has no browser to ask, so it assumes a connection. */
const getServerSnapshot = (): boolean => true;

export const useOnlineStatus = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
