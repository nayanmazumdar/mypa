import { useEffect } from 'react';

/**
 * Sets the document title for the current page.
 * @param {string} title - Page title (will be appended with " | MyPA")
 */
export function usePageTitle(title) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} | MyPA` : 'MyPA';
    return () => { document.title = prev; };
  }, [title]);
}
