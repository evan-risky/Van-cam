"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  apiGet,
  apiPost,
  ApiError,
  type EventView,
  type GuestSessionView,
} from "@/lib/api-client";

type MeResponse = {
  session:
    | (GuestSessionView & {
        photos?: Array<{ id: string; index: number; status: string }>;
      })
    | null;
  event: EventView | null;
};

type SessionContextValue = {
  ready: boolean;
  event: EventView | null;
  session: GuestSessionView | null;
  refresh: () => Promise<void>;
  createSession: (input: {
    name: string;
    quota: number;
  }) => Promise<{ ok: true } | { ok: false; message: string }>;
  resetSession: () => Promise<{ ok: true } | { ok: false; message: string }>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [event, setEvent] = useState<EventView | null>(null);
  const [session, setSession] = useState<GuestSessionView | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet<MeResponse>("/api/sessions/me");
      if (!mounted.current) return;
      setEvent(data.event);
      setSession(
        data.session
          ? {
              id: data.session.id,
              name: data.session.name,
              quota: data.session.quota,
              status: data.session.status,
              uploadedCount: data.session.uploadedCount,
              reservedCount: data.session.reservedCount,
            }
          : null,
      );
    } catch {
      if (!mounted.current) return;
      setEvent(null);
      setSession(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await apiGet<MeResponse>("/api/sessions/me");
        if (!active) return;
        setEvent(data.event);
        setSession(
          data.session
            ? {
                id: data.session.id,
                name: data.session.name,
                quota: data.session.quota,
                status: data.session.status,
                uploadedCount: data.session.uploadedCount,
                reservedCount: data.session.reservedCount,
              }
            : null,
        );
      } catch {
        if (active) {
          setEvent(null);
          setSession(null);
        }
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const createSession = useCallback<
    SessionContextValue["createSession"]
  >(async (input) => {
    try {
      const data = await apiPost<MeResponse>("/api/sessions", input);
      if (data.session) {
        setSession({
          id: data.session.id,
          name: data.session.name,
          quota: data.session.quota,
          status: data.session.status,
          uploadedCount: data.session.uploadedCount ?? 0,
          reservedCount: data.session.reservedCount ?? 0,
        });
      }
      if (data.event) setEvent(data.event);
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { ok: false, message: error.message };
      }
      return { ok: false, message: "Gagal memulai sesi." };
    }
  }, []);

  const resetSession = useCallback<
    SessionContextValue["resetSession"]
  >(async () => {
    try {
      await apiPost<{ ok: true }>("/api/sessions/me/reset", {});
      if (mounted.current) {
        setSession(null);
      }
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { ok: false, message: error.message };
      }
      return { ok: false, message: "Gagal mengakhiri sesi." };
    }
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ ready, event, session, refresh, createSession, resetSession }),
    [ready, event, session, refresh, createSession, resetSession],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession harus dipakai di dalam SessionProvider");
  }
  return context;
}