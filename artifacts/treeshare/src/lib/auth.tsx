import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthUser {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  emailAddresses: Array<{ emailAddress: string }>;
  updatePassword: (params: {
    currentPassword?: string;
    newPassword: string;
    signOutOfOtherSessions?: boolean;
  }) => Promise<void>;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

type Listener = (payload: { user: AuthUser | null }) => void;
const listeners = new Set<Listener>();

function mapUser(user: User | null): AuthUser | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    username: meta.username ?? meta.name ?? null,
    firstName: meta.first_name ?? meta.full_name?.split(" ")[0] ?? null,
    lastName: meta.last_name ?? meta.full_name?.split(" ").slice(1).join(" ") ?? null,
    imageUrl: meta.avatar_url ?? meta.picture ?? null,
    emailAddresses: user.email ? [{ emailAddress: user.email }] : [],
    updatePassword: async ({ newPassword }) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
  };
}

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setIsLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setIsLoaded(true);
      const newUserId = s?.user?.id ?? null;
      const mapped = mapUser(s?.user ?? null);
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== newUserId) {
        listeners.forEach((l) => l({ user: mapped }));
      }
      prevUserIdRef.current = newUserId;
    });

    return () => subscription.unsubscribe();
  }, []);

  const user = mapUser(session?.user ?? null);
  const isSignedIn = !!session?.user;
  const userId = session?.user?.id ?? null;

  const getToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, isLoaded, isSignedIn, userId, getToken, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within SupabaseAuthProvider");
  return {
    getToken: ctx.getToken,
    isSignedIn: ctx.isSignedIn,
    userId: ctx.userId,
  };
}

export function useUser() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useUser must be used within SupabaseAuthProvider");
  return {
    user: ctx.user,
    isLoaded: ctx.isLoaded,
    isSignedIn: ctx.isSignedIn,
  };
}

export function useClerk() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useClerk must be used within SupabaseAuthProvider");
  return {
    signOut: ctx.signOut,
    loaded: ctx.isLoaded,
    session: ctx.session,
    addListener: (listener: Listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function Show({
  when,
  children,
}: {
  when: "signed-in" | "signed-out";
  children: ReactNode;
}) {
  const ctx = useContext(AuthContext);
  if (!ctx) return null;
  if (!ctx.isLoaded) return null;
  if (when === "signed-in" && ctx.isSignedIn) return <>{children}</>;
  if (when === "signed-out" && !ctx.isSignedIn) return <>{children}</>;
  return null;
}
