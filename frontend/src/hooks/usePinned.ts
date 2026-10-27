import { useEffect, useRef, useState } from 'react';

import { isPinned } from '../utils/stickyPin';

/**
 * Whether a `sticky top-0` bar is pinned to the top of its scrolling area. Put `sentinelRef` on
 * a 1px element just before the bar that overlaps its top edge (`h-px -mb-px`), and `barRef` on
 * the bar. The observer's viewport root is clipped by every scrolling ancestor, so it notices
 * them crossing whichever area scrolls at the current width. It watches both: a single jump
 * (Home, the scrollbar) can take the sentinel from out of view above to out of view below
 * without a callback for it, but then the bar leaves the view. Each callback compares where the
 * two are now.
 */
export function usePinned<T extends HTMLElement>() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<T>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const bar = barRef.current;
    if (!sentinel || !bar) {
      return;
    }
    const observer = new IntersectionObserver(() => {
      setPinned(isPinned(sentinel.getBoundingClientRect().top, bar.getBoundingClientRect().top));
    });
    observer.observe(sentinel);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  return { sentinelRef, barRef, pinned };
}
