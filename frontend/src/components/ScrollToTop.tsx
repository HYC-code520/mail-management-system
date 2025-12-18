/**
 * ScrollToTop Component
 * 
 * Scrolls to top of page on route changes.
 * This ensures users always start at the top when navigating between pages.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
