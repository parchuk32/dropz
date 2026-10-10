"use client";

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase";

// Qui est connecté ? (null si personne). « ready » devient vrai quand on le sait.
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabaseConfigured);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const sb = supabase();
    sb.auth.getSession().then(({ data }: { data: { session: Session | null } }) => { setUser(data.session?.user ?? null); setReady(true); });
    const { data: sub } = sb.auth.onAuthStateChange((_event: string, session: Session | null) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, ready };
}