"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, supabaseConfigured } from "../../lib/supabase";

// Page où arrive la personne en cliquant sur le lien du courriel.
// Le client Supabase échange tout seul le code de l'adresse contre une session.
export default function AuthCallback() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) { setFailed(true); return; }
    const sb = supabase();
    const check = async () => (await sb.auth.getSession()).data.session;
    check().then(async (s) => {
      if (s) return window.location.replace("/");
      setTimeout(async () => { (await check()) ? window.location.replace("/") : setFailed(true); }, 1500);
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-5 text-center text-neutral-900">
      {failed ? (
        <>
          <h1 className="text-xl font-extrabold">Ce lien n&apos;a pas fonctionné</h1>
          <p className="max-w-xs text-sm text-neutral-500">Il a peut-être expiré, ou il a été ouvert dans un autre navigateur que celui où tu l&apos;as demandé. Redemande un lien, ou utilise le code à 6 chiffres.</p>
          <Link href="/connexion" className="mt-2 rounded-full bg-[#753AA9] px-6 py-3 text-sm font-semibold text-white">Réessayer</Link>
        </>
      ) : (
        <p className="text-sm text-neutral-500">Connexion en cours…</p>
      )}
    </div>
  );
}