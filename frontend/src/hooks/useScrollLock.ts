import { useEffect, useRef } from 'react';

/**
 * Hook to lock body scroll when modal/dialog is open
 * Handles iOS Safari issues with scroll locking
 */
export function useScrollLock(isLocked: boolean) {
  const scrollPosition = useRef(0);

  useEffect(() => {
    if (!isLocked) return;

    // Save current scroll position
    scrollPosition.current = window.pageYOffset || document.documentElement.scrollTop;

    const body = document.body;
    const html = document.documentElement;

    // iOS Safari fix: Set position fixed on body with negative top
    // This prevents the elastic/rubber-band scrolling
    body.style.position = 'fixed';
    body.style.top = `-${scrollPosition.current}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.overflow = 'hidden';

    // Prevent scrolling on html element as well
    html.style.overflow = 'hidden';

    // iOS-specific webkit overflow scrolling
    body.style.webkitOverflowScrolling = 'auto';

    // Cleanup function
    return () => {
      // Restore scroll position
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.overflow = '';
      html.style.overflow = '';
      body.style.webkitOverflowScrolling = '';

      // Restore scroll position
      window.scrollTo(0, scrollPosition.current);
    };
  }, [isLocked]);
}
