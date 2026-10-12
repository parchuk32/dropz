"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { loadSaved, removeSaved, type Saved } from "../lib/store";
import AccountSync from "../lib/AccountSync";
import { useUser } from "../lib/useUser";
import ConsentBanner from "../lib/ConsentBanner";
import { track } from "../lib/track.ts";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
type Live = { id: string | number; price: number; was: number; pct: number; sizes: string[] };
const fmt = (n: number) => `${n.toFixed(2).replace(".", ",")} $`;

export default function FavorisPage() {
  const [saved, setSaved] = useState<Saved[] | null>(null);
  const [deals, setDeals] = useState<Live[] | null>(null);
  const [tab, setTab] = useState<"all" | "want">("all");
  const { user, ready } = useUser();

  useEffect(() => {
    setSaved(loadSaved());
    fetch("/deals.json").then((r) => r.json()).then(setDeals).catch(() => setDeals([]));
  }, []);

  const live = useMemo(() => new Map((deals || []).map((d) => [String(d.id), d])), [deals]);

  const rows = useMemo(() => {
    return (saved || [])
      .filter((s) => tab === "all" || s.want)
      .map((s) => {
        const cur = live.get(String(s.id));
        const status = !deals ? "load" : !cur ? "gone" : cur.price < s.priceAtSave - 0.005 ? "drop" : cur.price > s.priceAtSave + 0.005 ? "up" : "same";
        return { s, cur, status };
      })
      .sort((a, b) => {
        const rank = (r: typeof a) => (r.status === "drop" ? 0 : r.s.want ? 1 : 2);
        return rank(a) - rank(b) || b.s.savedAt - a.s.savedAt;
      });
  }, [saved, live, deals, tab]);

  const drops = rows.filter((r) => r.status === "drop").length;
  const remove = (id: string | number) => setSaved(removeSaved(id));

  return (
    <div className={`${inter.className} min-h-screen bg-white text-neutral-900`}>
      <AccountSync />
      <ConsentBanner />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="text-sm font-semibold text-neutral-600 hover:text-black">← Accueil</Link>
        <h1 className="text-xl font-extrabold">Mes trouvailles</h1>
        <Link href="/swipe" className="rounded-full bg-[#753AA9] px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90">Swipe</Link>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16">
        {ready && !user && saved && saved.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f3edfa] px-4 py-3">
            <p className="text-sm font-semibold text-[#5b2a85]">Ces trouvailles ne sont gardées que sur cet appareil. Crée un compte gratuit pour ne pas les perdre.</p>
            <Link href="/connexion" className="shrink-0 rounded-full bg-[#753AA9] px-5 py-2 text-sm font-bold text-white hover:opacity-90">Créer mon compte</Link>
          </div>
        )}
        {saved && saved.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {(["all", "want"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${tab === t ? "bg-neutral-900 text-white" : "border border-neutral-200 text-neutral-700 hover:border-neutral-900"}`}>
                {t === "all" ? `Tout (${saved.length})` : "Je les veux"}
              </button>
            ))}
            {drops > 0 && <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-700">{drops} prix en baisse</span>}
          </div>
        )}

        {saved === null ? null : saved.length === 0 ? (
          <div className="py-24 text-center">
            <h2 className="text-2xl font-extrabold">Rien de sauvegardé pour l&apos;instant</h2>
            <p className="mt-2 text-sm text-neutral-500">Swipe à droite sur ce que tu aimes : tout se retrouve ici, et on te dit quand le prix baisse.</p>
            <Link href="/swipe" className="mt-6 inline-block rounded-full bg-[#753AA9] px-6 py-3 text-sm font-semibold text-white hover:opacity-90">Commencer à swiper</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {rows.map(({ s, cur, status }) => {
              const now = cur ? cur.price : s.price;
              const diff = Math.abs(now - s.priceAtSave);
              return (
                <article key={String(s.id)} className="flex gap-4 rounded-2xl border border-neutral-200 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt={s.name} className="h-32 w-24 shrink-0 rounded-xl object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-xs text-neutral-500">{s.brand || s.retailer} · {s.retailer}{s.want && <span className="ml-1 font-bold text-[#753AA9]">· Je le veux</span>}</p>
                    <h3 className="line-clamp-2 text-sm font-semibold">{s.name}</h3>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-lg font-extrabold text-[#d6336c]">{fmt(now)}</span>
                      <span className="text-xs text-neutral-400 line-through">{fmt(s.was)}</span>
                    </div>
                    <p className={`mt-1 text-xs font-semibold ${status === "drop" ? "text-emerald-600" : status === "up" ? "text-rose-600" : "text-neutral-500"}`}>
                      {status === "drop" && `Prix baissé de ${fmt(diff)} depuis ta sauvegarde`}
                      {status === "up" && `Prix monté de ${fmt(diff)}`}
                      {status === "same" && "Prix inchangé"}
                      {status === "gone" && "N'est plus dans les soldes (peut-être épuisé)"}
                      {status === "load" && "Vérification du prix…"}
                    </p>
                    <div className="mt-auto flex items-center gap-3 pt-2">
                      <a href={s.url} onClick={() => track("click_out", s)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90">Voir chez {s.retailer}</a>
                      <button onClick={() => remove(s.id)} className="text-xs font-semibold text-neutral-400 hover:text-rose-600">Retirer</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}