'use client';

import { useEffect, useRef } from 'react';

export function useFormSession(isOpen: boolean, identity: string, initialize: () => void) {
  const activeIdentity = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      activeIdentity.current = null;
      return;
    }
    if (activeIdentity.current === identity) return;
    activeIdentity.current = identity;
    initialize();
  }, [isOpen, identity, initialize]);
}
