import { useEffect } from 'react';

interface UseNavigationGuardOptions {
  isDirty: boolean;
}

/**
 * Prevents window/tab close when there are unsaved changes.
 * Uses beforeunload event to show browser-native confirmation.
 *
 * Note: In-app navigation guards (diagram switch, tab change) are handled
 * manually via confirm() in VirtualDiagramView handlers.
 */
export function useNavigationGuard({ isDirty }: UseNavigationGuardOptions) {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}
