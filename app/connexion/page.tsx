"use client";

import { useState } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { supabase, supabaseConfigured } from "../lib/supabase";
import { useUser } from "../lib/useUser";
import AccountSync from "../lib/AccountSync";
import ConsentBanner from "../lib/ConsentBanner";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

function friendly(msg: string) {
  if (/rate limit/i.test(msg)) return "Trop de courriels envoyés pour l'instant. Attends quelques minutes et réessaie.";
  if (/invalid login credentials/i.test(msg)) return "Courriel ou mot de passe incorrect.";
  if (/already registered|already been registered/i.test(msg)) return "Un compte existe déjà avec ce courriel. Connecte-toi plutôt.";
  if (/at least \d+ characters|weak password|too short/i.test(msg)) return "Le mot de passe est trop court : au moins 6 caractères.";
  if (/email/i.test(msg) && /invalid/i.test(msg)) return "Cette adresse courriel ne semble pas valide.";
  if (/expired|invalid/i.test(msg)) return "Ce code est invalide ou expiré. Demande-en un nouveau.";
  return msg;
}

export default function ConnexionPage() {
  const { user, ready } = useUser();
  const [mode, setMode] = useState<"password" | "link">("password");
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setInfo("");
    const sb = supabase();
    if (creating) {
      const { data, error } = await sb.auth.signUp({ email: email.trim(), password });
      setBusy(false);
      if (error) return setError(friendly(error.message));
      if (data.session) window.location.href = "/";
      else setInfo("Compte créé. Vérifie ta boîte courriel pour confirmer ton adresse, puis reviens te connecter.");
    } else {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) setError(friendly(error.message)); else window.location.href = "/";
    }
  }

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
  const tab = (on: boolean) => `flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${on ? "bg-white text-neutral-900 shadow" : "text-neutral-500 hover:text-neutral-900"}`;

  return (
    <div className={`${inter.className} flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#f3edfa] to-white px-5 py-10 text-neutral-900`}>
      <AccountSync />
      <ConsentBanner />
      <Link href="/" className="mb-6 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent" style={{ backgroundImage: "linear-gradient(90deg,#753AA9,#39D2C0)" }}>Dropz.</Link>

      <div className={box}>
        {!supabaseConfigured ? (
          <p className="text-sm text-neutral-600">Supabase n&apos;est pas configuré. Vérifie le fichier <code>app/lib/supabase.ts</code> ou <code>.env.local</code>, puis relance <code>npm run dev</code>.</p>
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
        ) : (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-extrabold">{creating && mode === "password" ? "Créer mon compte" : "Garde tes trouvailles"}</h1>
              <p className="mt-1 text-sm text-neutral-500">Gratuit. Tes trouvailles te suivent sur tous tes appareils.</p>
            </div>

            <div className="flex gap-1 rounded-xl bg-neutral-100 p-1">
              <button type="button" onClick={() => { setMode("password"); setError(""); setInfo(""); }} className={tab(mode === "password")}>Mot de passe</button>
              <button type="button" onClick={() => { setMode("link"); setError(""); setInfo(""); }} className={tab(mode === "link")}>Lien par courriel</button>
            </div>

            {mode === "password" ? (
              <form onSubmit={submitPassword} className="space-y-3">
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@courriel.com" className={input} />
                <input type="password" required minLength={6} autoComplete={creating ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe (6 caractères minimum)" className={input} />
                {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
                {info && <p className="text-sm font-semibold text-emerald-600">{info}</p>}
                <button type="submit" disabled={busy || !email || password.length < 6} className={primary}>
                  {busy ? "Patiente…" : creating ? "Créer mon compte" : "Me connecter"}
                </button>
                <button type="button" onClick={() => { setCreating(!creating); setError(""); setInfo(""); }} className="block w-full text-center text-sm font-semibold text-neutral-500 hover:text-neutral-900">
                  {creating ? "J'ai déjà un compte" : "Je n'ai pas de compte : en créer un"}
                </button>
              </form>
            ) : !sent ? (
              <form onSubmit={sendLink} className="space-y-3">
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@courriel.com" className={input} />
                {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
                <button type="submit" disabled={busy || !email} className={primary}>{busy ? "Envoi…" : "Recevoir mon lien"}</button>
                <p className="text-xs text-neutral-500">Ouvre le lien dans le même navigateur. Certaines messageries le rendent invalide : si ça arrive, utilise le mot de passe.</p>
              </form>
            ) : (
              <form onSubmit={verify} className="space-y-3">
                <p className="text-sm text-neutral-600">Message envoyé à <strong>{email}</strong>. Clique sur le lien (dans le même navigateur), ou entre le code à 6 chiffres s&apos;il y en a un.</p>
                <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code à 6 chiffres" className={input} />
                {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
                <button type="submit" disabled={busy || code.trim().length < 6} className={primary}>{busy ? "Vérification…" : "Valider le code"}</button>
                <button type="button" onClick={() => { setSent(false); setCode(""); setError(""); }} className="block w-full text-center text-sm font-semibold text-neutral-500 hover:text-neutral-900">Changer d&apos;adresse</button>
              </form>
            )}
          </div>
        )}
      </div>
      <p className="mt-6 max-w-xs text-center text-xs text-neutral-500">
        Le compte est facultatif : le site fonctionne sans. En créant un compte, tu acceptes les{" "}
        <Link href="/conditions" className="underline">conditions d&apos;utilisation</Link> et la{" "}
        <Link href="/confidentialite" className="underline">politique de confidentialité</Link>.
      </p>
    </div>
  );
}