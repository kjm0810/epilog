'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const ACCESS_TOKEN_COOKIE_KEY = 'accessToken';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AuthUser = {
  id: string | number;
  nickname: string;
  email?: string;
};

type UserAuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: AuthUser | null) => void;
  setAccessToken: (accessToken: string | null) => void;
  login: (params: { accessToken: string; user?: AuthUser | null }) => Promise<AuthUser | null>;
  loginWithCredentials: (params: { id: string; pw: string }) => Promise<AuthUser | null>;
  logout: () => void;
  initAuth: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
};

let initAuthInFlight: Promise<void> | null = null;
let refreshUserInFlight: Promise<AuthUser | null> | null = null;

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return;

  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${escaped}=([^;]*)`)
  );

  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearCookie(name: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

async function fetchMe(accessToken: string): Promise<AuthUser | null> {
  try {
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { user?: AuthUser };
    return data.user ?? null;
  } catch {
    return null;
  }
}

export const useUserAuthStore = create<UserAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isLoading: false,
      isInitialized: false,

      setUser: (user) => {
        set({ user });
      },

      setAccessToken: (accessToken) => {
        if (accessToken) {
          setCookie(ACCESS_TOKEN_COOKIE_KEY, accessToken, COOKIE_MAX_AGE_SECONDS);
          set({ accessToken });
          return;
        }

        clearCookie(ACCESS_TOKEN_COOKIE_KEY);
        set({ accessToken: null });
      },

      login: async ({ accessToken, user }) => {
        get().setAccessToken(accessToken);

        if (user) {
          set({ user, isInitialized: true });
          return user;
        }

        const fetchedUser = await get().refreshUser();
        return fetchedUser;
      },

      loginWithCredentials: async ({ id, pw }) => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id, pw }),
          credentials: 'include',
        });

        if (!response.ok) {
          return null;
        }

        const data = await response.json() as {
          data?: {
            accessToken?: string;
            user?: {
              user_index?: number;
              id?: string;
            };
          };
        };

        const accessToken = data.data?.accessToken;
        const userId = data.data?.user?.user_index;
        const nickname = data.data?.user?.id;

        if (!accessToken) {
          return null;
        }

        const loginUser = (userId && nickname)
          ? { id: userId, nickname }
          : null;

        return get().login({ accessToken, user: loginUser });
      },

      logout: () => {
        clearCookie(ACCESS_TOKEN_COOKIE_KEY);
        set({ user: null, accessToken: null, isInitialized: true, isLoading: false });
      },

      initAuth: async () => {
        if (initAuthInFlight) {
          return initAuthInFlight;
        }

        initAuthInFlight = (async () => {
          if (get().isLoading) {
            return;
          }

          const tokenInCookie = getCookie(ACCESS_TOKEN_COOKIE_KEY);
          const persistedToken = get().accessToken;
          const token = tokenInCookie ?? persistedToken;

          if (!token) {
            set({ user: null, accessToken: null, isInitialized: true, isLoading: false });
            return;
          }

          if (!tokenInCookie) {
            setCookie(ACCESS_TOKEN_COOKIE_KEY, token, COOKIE_MAX_AGE_SECONDS);
          }

          set({ accessToken: token, isLoading: true });

          const user = await fetchMe(token);

          if (!user) {
            clearCookie(ACCESS_TOKEN_COOKIE_KEY);
            set({ user: null, accessToken: null, isLoading: false, isInitialized: true });
            return;
          }

          set({ user, accessToken: token, isLoading: false, isInitialized: true });
        })();

        try {
          await initAuthInFlight;
        } finally {
          initAuthInFlight = null;
        }
      },

      refreshUser: async () => {
        if (refreshUserInFlight) {
          return refreshUserInFlight;
        }

        refreshUserInFlight = (async () => {
          if (get().isLoading) {
            return get().user;
          }

          const token = get().accessToken ?? getCookie(ACCESS_TOKEN_COOKIE_KEY);

          if (!token) {
            set({ user: null, accessToken: null, isLoading: false, isInitialized: true });
            return null;
          }

          set({ isLoading: true });
          const user = await fetchMe(token);

          if (!user) {
            clearCookie(ACCESS_TOKEN_COOKIE_KEY);
            set({ user: null, accessToken: null, isLoading: false, isInitialized: true });
            return null;
          }

          set({ user, accessToken: token, isLoading: false, isInitialized: true });
          return user;
        })();

        try {
          return await refreshUserInFlight;
        } finally {
          refreshUserInFlight = null;
        }
      },
    }),
    {
      name: 'epilog-user-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
    }
  )
);
