'use client';

import { useEffect } from 'react';
import { useUserAuthStore } from '@/store/userAuth';

export default function AuthBootstrap() {
  const initAuth = useUserAuthStore((state) => state.initAuth);
  const isInitialized = useUserAuthStore((state) => state.isInitialized);
  const isLoading = useUserAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (isInitialized || isLoading) {
      return;
    }

    void initAuth();
  }, [initAuth, isInitialized, isLoading]);

  return null;
}
