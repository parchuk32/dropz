"use client";

import { useState } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { useUser } from "../lib/useUser";
import AccountSync from "../lib/AccountSync";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

function friendly(msg: string) {
  if (/rate limit/i.test(msg)) return "Trop de courriels envoyés pour l'instant. Attends quelques minutes et réessaie.";
  if (/email/i.test(msg) && /invalid/i.test(msg)) return "Cette adresse courriel ne semble pas valide.";
  if (/expired|invalid/i.test(msg)) return "Ce code est invalide ou expiré. Demande-en un nouveau.";
  return msg;
}

export default function ConnexionPage() {
  const { user, ready } = useUser();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error } = await supabase().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) setError(friendly(error.message)); else setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error } = await supabase().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError(friendly(error.message)); else window.location.href = "/";
  }

  const box = "w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl";
  const input = "w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm outline-none focus:border-[#753AA9] focus:bg-white focus:ring-2 focus:ring-[#753AA9]/20";
  const primary = "w-full rounded-xl bg-gradient-to-r from-[#753AA9] to-[#d6336c] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50";

  return (
    <div className={`${inter.className} flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#f3edfa] to-white px-5 py-10 text-neutral-900`}>
      <AccountSync />
      <Link href="/" className="mb-6 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent" style={{ backgroundImage: "linear-gradient(90deg,#753AA9,#39D2C0)" }}>Dropz.</Link>

      <div className={box}>
        {!supabaseConfigured ? (
          <p className="text-sm text-neutral-600">Supabase n&apos;est pas configuré. Vérifie que le fichier <code>.env.local</code> contient les deux clés, puis relance <code>npm run dev</code>.</p>
        ) : !ready ? (
          <p className="text-sm text-neutral-500">Chargement…</p>
        ) : user ? (
          <div className="text-center">
            <h1 className="text-xl font-extrabold">Tu es connecté</h1>
            <p className="mt-1 break-all text-sm text-neutral-500">{user.email}</p>
            <p className="mt-4 text-sm text-neutral-600">Tes trouvailles, tes goûts et ta taille te suivent maintenant sur tous tes appareils.</p>
            <Link href="/" className={`${primary} mt-5 block`}>Retour au site</Link>
            <button onClick={() => supabase().auth.signOut()} className="mt-3 text-sm font-semibold text-neutral-500 hover:text-rose-600">Se déconnecter</button>
          </div>
        ) : !sent ? (
          <form onSubmit={sendLink} className="space-y-4">
            <div>
              <h1 className="text-xl font-extrabold">Garde tes trouvailles</h1>
              <p className="mt-1 text-sm text-neutral-500">Gratuit, sans mot de passe. On t&apos;envoie un lien par courriel.</p>
            </div>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@courriel.com" className={input} />
            {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
            <button type="submit" disabled={busy || !email} className={primary}>{busy ? "Envoi…" : "Recevoir mon lien"}</button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <div>
              <h1 className="text-xl font-extrabold">Vérifie ta boîte courriel</h1>
              <p className="mt-1 text-sm text-neutral-500">On a envoyé un message à <strong>{email}</strong>. Clique sur le lien dans ce courriel (dans le même navigateur), ou entre le code à 6 chiffres s&apos;il y en a un.</p>
            </div>
            <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code à 6 chiffres" className={input} />
            {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
            <button type="submit" disabled={busy || code.trim().length < 6} className={primary}>{busy ? "Vérification…" : "Valider le code"}</button>
            <button type="button" onClick={() => { setSent(false); setCode(""); setError(""); }} className="block w-full text-center text-sm font-semibold text-neutral-500 hover:text-neutral-900">Changer d&apos;adresse</button>
          </form>
        )}
      </div>
      <p className="mt-6 max-w-xs text-center text-xs text-neutral-500">Le compte est facultatif : le site fonctionne sans.</p>
    </div>
  );
}