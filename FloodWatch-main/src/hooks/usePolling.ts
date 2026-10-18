/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * usePolling — lightweight interval-based data refresh hook.
 *
 * The FloodWatch architecture is plain HTTP + JSON, so "real-time" is
 * implemented via periodic polling of the read endpoints. This hook runs a
 * callback on an interval and cleans up on unmount. Errors are swallowed so a
 * transient backend outage never crashes the UI.
 */

import { useEffect, useRef } from 'react';

export function usePolling(callback: () => void | Promise<void>, intervalMs: number): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!intervalMs || intervalMs <= 0) return;

    const timer = setInterval(async () => {
      try {
        await savedCallback.current();
      } catch {
        // Transient failures are intentionally ignored; the next poll retries.
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);
}
