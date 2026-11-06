"use client";

/** The signed-in customer, as the browser sees it (from GET /api/me). */
import { create } from "zustand";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  profile: Record<string, unknown> & {
    heightCm?: number;
    weightKg?: number;
    chestCm?: number;
    waistCm?: number;
    footEu?: number;
    defaultSize?: string;
    district?: string;
    phone?: string;
  };
}

export interface Me {
  user: SessionUser | null;
  wallet?: {
    balance: number;
    history: Array<{ id: string; amount: number; reason: string; at: string }>;
  };
  notifications?: Array<{
    id: string;
    title: string;
    body: string;
    href?: string;
    createdAt: string;
    read?: boolean;
  }>;
  unread?: number;
  waitlist?: Array<{
    id: string;
    productId: string;
    size?: string;
    kind: string;
    name: string;
    createdAt: string;
  }>;
  orderCount?: number;
  sizeHistory?: import("@/lib/sizing").SizeHistoryEntry[];
}

interface SessionState {
  me: Me | null; // null until loaded
  loading: boolean;
  refresh: () => Promise<Me>;
  set: (me: Me) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  me: null,
  loading: false,
  refresh: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const me = (await res.json()) as Me;
      set({ me, loading: false });
      return me;
    } catch {
      const me: Me = { user: null };
      set({ me, loading: false });
      return me;
    }
  },
  set: (me) => set({ me }),
}));

/** POST JSON to the shop API; throws an Error with the server's message on failure. */
export async function api<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const error = new Error(data.error ?? "Something went wrong.") as Error & {
      status?: number;
      data?: unknown;
    };
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}
