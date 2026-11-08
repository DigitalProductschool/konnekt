import { useEffect, useRef, useState } from 'react';

import { isPinned } from '../utils/stickyPin';

/**
 * Whether a sticky bar is pinned. Put `sentinelRef` on a 1px element just before the bar that
 * overlaps its top edge (`h-px -mb-px`), and `barRef` on the bar. The observer's viewport root
 * is clipped by every scrolling ancestor, so it notices them crossing whichever area scrolls at
 * the current width. It watches both: a single jump (Home, the scrollbar) can take the sentinel
 * from out of view above to out of view below without a callback for it, but then the bar leaves
 * the view. In the wizard the page scrolls and the bar pins under its sticky header, an edge the
 * observer doesn't see (T033), so a scroll of the page compares them too. Each callback compares
 * where the two are now.
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
    const update = () => {
      setPinned(isPinned(sentinel.getBoundingClientRect().top, bar.getBoundingClientRect().top));
    };
    const observer = new IntersectionObserver(update);
    observer.observe(sentinel);
    observer.observe(bar);
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', update);
    };
  }, []);

  return { sentinelRef, barRef, pinned };
}
