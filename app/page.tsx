"use client";

import { useEffect, useMemo, useState } from "react";
import { Inter } from "next/font/google";
import Link from "next/link";
import { addSaved, removeSaved, loadSaved, loadTaste, affinity, type Taste } from "./lib/store";
import { DEFAULT_PROFILE, loadProfile, passes, saveProfile, type Profile } from "./lib/filters-core";
import FilterBar from "./lib/FilterBar";
import AccountSync from "./lib/AccountSync";
import { useUser } from "./lib/useUser";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

// ---------- Données réelles : /public/deals.json (produit par n8n) ----------
type Deal = {
  retailer: string; id: number; name: string; brand: string; price: number; was: number; pct: number;
  sizes: string[]; gender: string; image: string; url: string; collection: string;
};
type Group = "all" | "femme" | "homme" | "ado" | "enfant" | "bebe";

const GROUPS: { id: Group; label: string }[] = [
  { id: "all", label: "Tout" }, { id: "femme", label: "Femme" }, { id: "homme", label: "Homme" },
  { id: "ado", label: "Ado" }, { id: "enfant", label: "Enfant" }, { id: "bebe", label: "Bébé" },
];

function groupOf(g: string): Exclude<Group, "all"> | "autre" | null {
  const t = g.toLowerCase();
  if (t === "home" || t === "others") return null;
  if (/baby|bebe|bébé/.test(t)) return "bebe";
  if (/teen|^ado/.test(t)) return "ado";
  if (/women|femme|ladies/.test(t)) return "femme";
  if (/^men$|homme/.test(t)) return "homme";
  if (/kid|enfant|girl|boy|fille|garcon|sitebm/.test(t)) return "enfant";
  return "autre";
}

const fmt = (n: number) => `${n.toFixed(2).replace(".", ",")} $`;

const score = (d: Deal) => (d.was - d.price) * (d.pct / 100);

function mixByRetailer(list: Deal[], key: (d: Deal) => number = (d) => -score(d)): Deal[] {
  const buckets = new Map<string, Deal[]>();
  ([...list].sort((a, b) => key(a) - key(b))).forEach((d) => {
    if (!buckets.has(d.retailer)) buckets.set(d.retailer, []);
    buckets.get(d.retailer)!.push(d);
  });
  const cols = [...buckets.values()];
  const out: Deal[] = [];
  for (let k = 0; ; k++) {
    let added = false;
    cols.forEach((col) => { if (col[k]) { out.push(col[k]); added = true; } });
    if (!added) break;
  }
  return out;
}

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
type SortId = "mix" | "rabais" | "prixAsc" | "prixDesc" | "boutique";
const SORTS: { id: SortId; label: string }[] = [
  { id: "mix", label: "Mélange des boutiques" }, { id: "rabais", label: "Plus gros rabais" },
  { id: "prixAsc", label: "Prix : bas à haut" }, { id: "prixDesc", label: "Prix : haut à bas" }, { id: "boutique", label: "Boutique (A à Z)" },
];
function sortDeals(list: Deal[], sort: SortId): Deal[] {
  if (sort === "rabais") return [...list].sort((a, b) => b.pct - a.pct);
  if (sort === "prixAsc") return [...list].sort((a, b) => a.price - b.price);
  if (sort === "prixDesc") return [...list].sort((a, b) => b.price - a.price);
  if (sort === "boutique") return [...list].sort((a, b) => a.retailer.localeCompare(b.retailer) || b.pct - a.pct);
  return mixByRetailer(list, (d) => hash(String(d.id)));
}

// ---------- Icônes ----------
const Icon = ({ d, className = "h-6 w-6" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d={d} />
  </svg>
);
const HEART = "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z";
const USER = "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z";
const SEARCH = "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3";

function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`bg-clip-text font-extrabold tracking-tight text-transparent ${className}`} style={{ backgroundImage: "linear-gradient(90deg,#753AA9,#39D2C0)" }}>
      Dropz.
    </span>
  );
}

// ---------- Background Animé Ultra Stylé ----------
function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
      {/* Balises de style pour les keyframes CSS fluides */}
      <style jsx global>{`
        @keyframes floatSlow1 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(60px, 40px) scale(1.1); }
        }
        @keyframes floatSlow2 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-50px, -60px) scale(1.15); }
        }
        @keyframes floatSlow3 {
          0%, 100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(40px, -50px) scale(1.05); }
        }
        .animate-blob-1 { animation: floatSlow1 12s ease-in-out infinite; }
        .animate-blob-2 { animation: floatSlow2 16s ease-in-out infinite; }
        .animate-blob-3 { animation: floatSlow3 14s ease-in-out infinite; }
      `}</style>
      
      {/* Orbe violette haut gauche */}
      <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-[#753AA9]/20 blur-[100px] animate-blob-1" />
      {/* Orbe turquoise droite */}
      <div className="absolute top-1/4 -right-20 h-[420px] w-[420px] rounded-full bg-[#39D2C0]/20 blur-[120px] animate-blob-2" />
      {/* Orbe rose/violette centre bas */}
      <div className="absolute top-2/3 left-1/3 h-[380px] w-[380px] rounded-full bg-[#d6336c]/15 blur-[110px] animate-blob-3" />
    </div>
  );
}

// ---------- Carrousel : Top 3 des plus grosses économies ----------
function Hero({ top, loading }: { top: Deal[]; loading: boolean }) {
  const [i, setI] = useState(1);
  const [hover, setHover] = useState(false);
  const n = top.length;
  const idx = n ? i % n : 0;

  useEffect(() => {
    if (n < 2 || hover) return;
    const id = setInterval(() => setI((v) => (v + 1) % n), 4500);
    return () => clearInterval(id);
  }, [n, hover]);

  if (!loading && n === 0) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#f3edfa]/80 to-white/50 backdrop-blur-sm" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="pt-8 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Top 3 · Économies du moment</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">Les aubaines qui te font garder le plus d&apos;argent</h1>
      </div>

      <div className="relative mx-auto h-[430px] max-w-6xl sm:h-[490px]">
        {loading
          ? [-1, 0, 1].map((o) => (
              <div key={o} className="absolute left-1/2 top-1/2 h-[340px] w-[250px] animate-pulse rounded-2xl bg-neutral-200/80 sm:h-[400px] sm:w-[290px]"
                style={{ transform: `translate(calc(-50% + ${o * 300}px), -50%) scale(${o === 0 ? 1 : 0.82})` }} />
            ))
          : top.map((d, k) => {
              const offset = n === 3 ? ((k - idx + 1 + n) % n) - 1 : k - idx;
              const center = offset === 0;
              const saved = Math.round(d.was - d.price);
              return (
                <a
                  key={d.id}
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { if (!center) { e.preventDefault(); setI(k); } }}
                  className="absolute left-1/2 top-1/2 block h-[340px] w-[250px] overflow-hidden rounded-2xl bg-neutral-100 shadow-xl ring-1 ring-black/5 transition-all duration-700 ease-out sm:h-[400px] sm:w-[290px]"
                  style={{
                    transform: `translate(calc(-50% + ${offset * 300}px), -50%) scale(${center ? 1 : 0.82})`,
                    opacity: center ? 1 : 0.6,
                    zIndex: center ? 2 : 1,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.image} alt={d.name} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
                  <span className="absolute left-3 top-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-extrabold text-white shadow">Économise {saved} $</span>
                  <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-extrabold text-neutral-900 shadow">{k + 1}</span>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/95 to-white/0 px-4 pb-4 pt-16">
                    <p className="text-xs font-medium text-neutral-500">{d.brand || d.retailer} · {d.retailer}</p>
                    <h2 className="line-clamp-2 text-base font-extrabold leading-tight text-neutral-900">{d.name}</h2>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-extrabold text-[#d6336c]">{fmt(d.price)}</span>
                      <span className="text-sm text-neutral-400 line-through">{fmt(d.was)}</span>
                      <span className="text-xs font-bold text-[#d6336c]">-{d.pct} %</span>
                    </div>
                  </div>
                </a>
              );
            })}
      </div>

      {n > 1 && (
        <div className="flex justify-center gap-2 pb-5">
          {top.map((_, k) => (
            <button key={k} onClick={() => setI(k)} aria-label={`Aubaine ${k + 1}`} className={`h-2 rounded-full transition-all ${k === idx ? "w-6 bg-[#753AA9]" : "w-2 bg-black/20"}`} />
          ))}
        </div>
      )}
    </section>
  );
}

// ---------- Carte produit (vraie aubaine) ----------
function DealCard({ d }: { d: Deal }) {
  const [liked, setLiked] = useState(false);
  useEffect(() => { setLiked(loadSaved().some((s) => String(s.id) === String(d.id))); }, [d.id]);
  const toggleSaved = () => { if (liked) removeSaved(d.id); else addSaved(d, false); setLiked(!liked); };
  return (
    <article className="group">
      <a href={d.url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-neutral-100 shadow-sm transition hover:shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.image} alt={d.name} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
          <span className="absolute left-2 top-2 rounded-md bg-[#d6336c] px-2 py-1 text-[11px] font-bold text-white shadow">-{d.pct} %</span>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSaved(); }}
            aria-label="Ajouter aux favoris"
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-105"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill={liked ? "#e11d48" : "none"} stroke={liked ? "#e11d48" : "currentColor"} strokeWidth="1.8" strokeLinejoin="round">
              <path d={HEART} />
            </svg>
          </button>
          <span className="absolute inset-x-2 bottom-2 translate-y-2 rounded-lg bg-black/90 py-2 text-center text-sm font-semibold text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
            Voir chez {d.retailer}
          </span>
        </div>
        <div className="px-0.5 pt-3">
          <p className="text-xs text-neutral-500">{d.brand || d.retailer}</p>
          <h3 className="truncate text-sm font-medium text-neutral-900">{d.name}</h3>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-base font-bold text-[#d6336c]">{fmt(d.price)}</span>
            <span className="text-xs text-neutral-400 line-through">{fmt(d.was)}</span>
          </div>
          {d.sizes.length > 0 && <p className="mt-1 truncate text-xs text-neutral-500">Tailles : {d.sizes.join(", ")}</p>}
        </div>
      </a>
    </article>
  );
}

function Skeletons() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, k) => (
        <div key={k} className="animate-pulse">
          <div className="aspect-[3/4] rounded-xl bg-neutral-200" />
          <div className="mt-3 h-3 w-2/3 rounded bg-neutral-200" />
          <div className="mt-2 h-3 w-1/2 rounded bg-neutral-200" />
        </div>
      ))}
    </div>
  );
}

// ---------- Section ----------
function Section({ title, subtitle, deals, loading }: { title: string; subtitle: string; deals: Deal[]; loading: boolean }) {
  const [all, setAll] = useState(false);
  if (!loading && deals.length === 0) return null;
  const shown = all ? deals.slice(0, 24) : deals.slice(0, 6);
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        </div>
        {deals.length > 6 && (
          <button onClick={() => setAll(!all)} className="text-sm font-semibold text-[#753AA9] hover:underline">
            {all ? "Voir moins" : "Voir tout"}
          </button>
        )}
      </div>
      {loading ? <Skeletons /> : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {shown.map((d) => <DealCard key={d.id} d={d} />)}
        </div>
      )}
    </section>
  );
}

// ---------- Tout parcourir : tous les articles, par pages de 24 ----------
const PAGE = 24;
function AllSection({ id, title, subtitle, deals, loading }: { id: string; title: string; subtitle: string; deals: Deal[]; loading: boolean }) {
  const [sort, setSort] = useState<SortId>("mix");
  const [count, setCount] = useState(PAGE);
  const sorted = useMemo(() => sortDeals(deals, sort), [deals, sort]);
  useEffect(() => { setCount(PAGE); }, [deals, sort]);
  if (!loading && deals.length === 0) return null;
  const left = sorted.length - count;
  return (
    <section id={id} className="mx-auto max-w-7xl scroll-mt-44 px-4 py-8 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          Trier
          <select value={sort} onChange={(e) => setSort(e.target.value as SortId)} className="rounded-full border border-neutral-300 bg-white/80 px-3 py-1.5 text-sm font-semibold text-neutral-800 outline-none backdrop-blur focus:border-[#753AA9]">
            {SORTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
      </div>
      {loading ? <Skeletons /> : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {sorted.slice(0, count).map((d) => <DealCard key={d.id} d={d} />)}
          </div>
          {left > 0 && (
            <div className="mt-8 text-center">
              <button onClick={() => setCount(count + PAGE)} className="rounded-full border border-neutral-300 bg-white/90 px-8 py-3 text-sm font-bold text-neutral-900 shadow-sm backdrop-blur hover:border-neutral-900">
                Voir plus ({left} restants)
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ---------- Page ----------
export default function HomePage() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const group = profile.group as Group;
  const updateProfile = (p: Profile) => { setProfile(p); saveProfile(p); };
  const setGroup = (g: Group) => updateProfile({ ...profile, group: g });
  const [taste, setTaste] = useState<Taste | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const { user } = useUser();

  useEffect(() => {
    setTaste(loadTaste()); setSavedCount(loadSaved().length); setProfile(loadProfile());
    const sync = () => setSavedCount(loadSaved().length);
    window.addEventListener("dropz:saved", sync);
    return () => window.removeEventListener("dropz:saved", sync);
  }, []);

  useEffect(() => {
    fetch("/deals.json").then((r) => r.json()).then(setDeals).catch(() => setLoadError(true));
  }, []);

  const pool = useMemo(
    () => (deals || []).filter((d) => d.image && groupOf(d.gender) !== null),
    [deals]
  );

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => pool.filter((d) => (group === "all" || groupOf(d.gender) === group) && passes(d, profile) && (!q || `${d.name} ${d.brand}`.toLowerCase().includes(q))),
    [pool, group, profile, q]
  );

  const forYou = useMemo(() => {
    if (!taste || taste.swipes < 5) return [];
    return filtered
      .filter((d) => affinity(d, taste) > 0)
      .sort((a, b) => (score(b) + affinity(b, taste) * 25) - (score(a) + affinity(a, taste) * 25))
      .slice(0, 24);
  }, [filtered, taste]);

  const top3 = useMemo(() => {
    const sorted = pool.filter((d) => d.pct >= 30 && passes(d, profile)).sort((x, y) => (y.was - y.price) - (x.was - x.price));
    const out: Deal[] = [];
    const used = new Set<string>();
    for (const d of sorted) {
      if (used.has(d.retailer)) continue;
      used.add(d.retailer);
      out.push(d);
      if (out.length === 3) break;
    }
    return out;
  }, [pool, profile]);

  const biggest = useMemo(() => mixByRetailer(filtered), [filtered]);
  const cheap = useMemo(() => mixByRetailer(filtered.filter((d) => d.price <= 15), (d) => -d.pct), [filtered]);
  const family = useMemo(() => {
    const buckets = (["femme", "homme", "ado", "enfant", "bebe"] as const).map((g) => mixByRetailer(filtered.filter((d) => groupOf(d.gender) === g)));
    const out: Deal[] = [];
    for (let k = 0; out.length < 24 && k < 24; k++) buckets.forEach((b) => b[k] && out.push(b[k]));
    return out;
  }, [filtered]);

  const loading = !deals && !loadError;

  return (
    <div className={`${inter.className} relative min-h-screen bg-white/80 text-neutral-900 overflow-x-hidden`}>
      {/* Intégration du background animé flottant */}
      <AnimatedBackground />

      <AccountSync />
      <div className="bg-neutral-900 py-2 text-center text-xs font-medium text-white shadow-inner">
        Les meilleures aubaines des magasins, au même endroit
      </div>

      <header className="sticky top-0 z-30 border-b border-neutral-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:gap-8 sm:px-6">
          <Logo className="text-3xl sm:text-4xl" />

          <div className="relative mx-auto hidden w-full max-w-xl sm:block">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chercher une marque, un item..."
              className="w-full rounded-full border border-neutral-300/85 bg-white/70 py-2.5 pl-5 pr-12 text-sm outline-none backdrop-blur transition focus:border-[#753AA9] focus:bg-white focus:ring-2 focus:ring-[#753AA9]/20"
            />
            <span className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#753AA9] text-white">
              <Icon d={SEARCH} className="h-4 w-4" />
            </span>
          </div>

          <div className="ml-auto flex items-center gap-4 sm:gap-5">
            <Link href="/connexion" aria-label="Compte" className="relative text-neutral-700 hover:text-black">
              <Icon d={USER} />
              {user && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />}
            </Link>
            <Link href="/favoris" aria-label="Mes trouvailles" className="relative text-neutral-700 hover:text-black">
              <Icon d={HEART} />
              {savedCount > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#d6336c] px-1 text-[10px] font-bold text-white">{savedCount}</span>}
            </Link>
          </div>
        </div>

        <div className="px-4 pb-3 sm:hidden">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher une marque, un item..."
            className="w-full rounded-full border border-neutral-300 bg-white/80 px-4 py-2 text-sm outline-none backdrop-blur focus:border-[#753AA9]"
          />
        </div>

        <div className="mx-auto max-w-7xl border-t border-neutral-100 px-4 py-2.5 sm:px-6">
          <FilterBar profile={profile} onChange={updateProfile} count={filtered.length} />
        </div>

        <nav className="border-t border-neutral-100">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2.5 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href="/swipe" className="shrink-0 rounded-full bg-[#753AA9] px-5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
              Swipe
            </Link>
            <a href="#tout" className="shrink-0 rounded-full border border-[#753AA9] px-4 py-1.5 text-sm font-semibold text-[#753AA9] transition hover:bg-[#f3edfa]">
              Tout parcourir
            </a>
            {GROUPS.map((g) => (
              <button
                key={g.id}
                onClick={() => setGroup(g.id)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  group === g.id ? "border-neutral-900 bg-neutral-900 text-white shadow-sm" : "border-neutral-200/80 bg-white/50 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main>
        <Hero top={top3} loading={loading} />

        {loadError ? (
          <p className="mx-auto max-w-md px-4 py-16 text-center text-sm text-neutral-600">
            Impossible de lire <code>deals.json</code>. Vérifie qu&apos;il est bien dans le dossier <code>public</code> de ton projet.
          </p>
        ) : q ? (
          <>
            <AllSection id="resultats" title={`Résultats pour « ${query.trim()} »`} subtitle={`${filtered.length} aubaine(s) trouvée(s)`} deals={filtered} loading={loading} />
            {!loading && filtered.length === 0 && (
              <p className="mx-auto max-w-md px-4 py-16 text-center text-sm text-neutral-500">Aucun résultat. Essaie un autre mot, ou efface des filtres.</p>
            )}
          </>
        ) : (
          <>
            <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
              <Link href="/swipe" className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#753AA9] to-[#39D2C0] px-5 py-4 text-white shadow-lg transition hover:opacity-95 hover:shadow-xl">
                <div>
                  <p className="text-lg font-extrabold">Swipe pour trouver tes aubaines</p>
                  <p className="text-sm text-white/90">Dropz apprend ce que tu aimes et te garde tes trouvailles, avec une alerte quand le prix baisse.</p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#753AA9] shadow">Essayer</span>
              </Link>
            </div>
            {!loading && filtered.length === 0 && (
              <div className="mx-auto max-w-md px-4 py-16 text-center">
                <h2 className="text-xl font-extrabold">Rien ne correspond à tes filtres</h2>
                <p className="mt-2 text-sm text-neutral-500">Élargis ta recherche : retire un filtre ou augmente ton budget.</p>
                <button onClick={() => updateProfile({ ...profile, sizes: [], types: [], maxPrice: null, minPct: null })} className="mt-5 rounded-full bg-[#753AA9] px-6 py-3 text-sm font-semibold text-white shadow hover:opacity-90">Effacer les filtres</button>
              </div>
            )}
            <Section title="Pour toi" subtitle="D'après ce que tu as aimé dans le Swipe" deals={forYou} loading={false} />
            <Section title="Plus gros rabais" subtitle="Les meilleures réductions du moment" deals={biggest} loading={loading} />
            <Section title="À bas prix" subtitle="Des aubaines à 15 $ ou moins" deals={cheap} loading={loading} />
            {group === "all" && (
              <Section title="Pour toute la famille" subtitle="Femme, homme, ado, enfant et bébé" deals={family} loading={loading} />
            )}
            <AllSection id="tout" title="Tout parcourir" subtitle={`${filtered.length} articles de toutes les boutiques, sans classement`} deals={filtered} loading={loading} />
          </>
        )}
      </main>

      <footer className="mt-10 border-t border-neutral-200/60 bg-neutral-50/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 text-center text-sm text-neutral-500 sm:flex-row sm:text-left">
          <Logo className="text-2xl" />
          <p className="max-w-md text-xs">
            Aubaines tirées des sites des magasins. Les prix et les stocks sont ceux du site en ligne et peuvent changer ; un article en ligne n&apos;est pas toujours disponible en magasin.
          </p>
          <p>© 2026 Dropz.</p>
        </div>
      </footer>
    </div>
  );
}