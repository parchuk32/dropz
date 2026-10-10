"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Inter } from "next/font/google";
import { addSaved, removeSaved, learn, loadSaved, loadTaste, affinity, loadSeen, markSeen, unmarkSeen, clearSeen, type Taste } from "../lib/store";
import AccountSync from "../lib/AccountSync";
import { useUser } from "../lib/useUser";
import { DEFAULT_PROFILE, loadProfile, passes, saveProfile, type Profile } from "../lib/filters-core";
import FilterBar from "../lib/FilterBar";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

type Dir = "left" | "right" | "up";
type Group = "all" | "femme" | "homme" | "ado" | "enfant" | "bebe";
type Deal = {
  retailer: string; id: number; name: string; brand: string; price: number; was: number; pct: number;
  sizes: string[]; gender: string; image: string; url: string; collection: string;
};
type RawStore = { id: string; name: string; lat: number; lng: number; address?: string; city?: string };
type Branch = { name: string; area: string; lat: number; lng: number };

const TR = { lat: 46.3432, lng: -72.5476, label: "Trois-Rivières" };
const GROUPS: { id: Group; label: string }[] = [
  { id: "all", label: "Tout" }, { id: "femme", label: "Femme" }, { id: "homme", label: "Homme" },
  { id: "ado", label: "Ado" }, { id: "enfant", label: "Enfant" }, { id: "bebe", label: "Bébé" },
];

function groupOf(g: string): Group | "autre" | null {
  const t = g.toLowerCase();
  if (t === "home" || t === "others") return null; // maison, autres : ignorés
  if (/baby|bebe|bébé/.test(t)) return "bebe";
  if (/teen|^ado/.test(t)) return "ado";
  if (/women|femme|ladies/.test(t)) return "femme";
  if (/^men$|homme/.test(t)) return "homme";
  if (/kid|enfant|girl|boy|fille|garcon|sitebm/.test(t)) return "enfant";
  return "autre"; // boutiques sans info de catégorie (visibles dans « Tout »)
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

const fmt = (n: number) => `${n.toFixed(2).replace(".", ",")} $`;

// Les plus belles aubaines : économie en $ pondérée par le % de rabais
const score = (d: Deal) => (d.was - d.price) * (d.pct / 100);
// Alterne les boutiques pour que la liste ne soit pas dominée par une seule
function mixByRetailer(list: Deal[], key: (d: Deal) => number = (d) => -score(d)): Deal[] {
  const buckets = new Map<string, Deal[]>();
  [...list].sort((a, b) => key(a) - key(b)).forEach((d) => {
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
const fmtKm = (k: number) => `${k < 10 ? k.toFixed(1).replace(".", ",") : Math.round(k)} km`;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
// Réordonne les cartes selon ce que la personne a aimé (marques, boutiques, catégories)
function personalize(list: Deal[], t: Taste): Deal[] {
  if (t.swipes < 3) return list;
  return [...list].sort((a, b) => (score(b) + affinity(b, t) * 25) - (score(a) + affinity(a, t) * 25));
}
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
const directions = (b: Branch) => `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`;

const Ico = ({ d, className = "h-7 w-7", fill = "none" }: { d: string; className?: string; fill?: string }) => (
  <svg viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d={d} />
  </svg>
);
const X = "M18 6 6 18M6 6l12 12";
const HEART = "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z";
const BAG = "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0";
const UNDO = "M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8";
const PIN = "M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z";

const DZ_CSS = `
@keyframes dz-float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(50px,-40px) scale(1.18)}}
@keyframes dz-drift{0%{transform:scale(1.05) translate(0,0)}100%{transform:scale(1.22) translate(-40px,25px)}}
@keyframes dz-fade{from{opacity:0}to{opacity:.55}}
@keyframes dz-burst{0%{transform:translate(-50%,-50%) scale(.4);opacity:0}15%{opacity:1}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(1.25) rotate(var(--rot));opacity:0}}
@keyframes dz-bump{0%{transform:scale(1)}40%{transform:scale(1.22)}100%{transform:scale(1)}}
@media (prefers-reduced-motion: reduce){.dz-anim{animation:none!important}}
`;

// Fond vivant : la photo de la carte affichée, floutée, + des taches de couleur qui bougent
function Backdrop({ image }: { image?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {image && (
        <div key={image} className="dz-anim absolute -inset-24 bg-cover bg-center blur-3xl saturate-150"
          style={{ backgroundImage: `url("${image}")`, animation: "dz-fade .9s ease-out forwards, dz-drift 20s ease-in-out infinite alternate", opacity: 0.55 }} />
      )}
      <div className="dz-anim absolute -left-24 top-8 h-80 w-80 rounded-full bg-[#753AA9] opacity-50 blur-3xl" style={{ animation: "dz-float 14s ease-in-out infinite" }} />
      <div className="dz-anim absolute -right-24 bottom-10 h-96 w-96 rounded-full bg-[#39D2C0] opacity-30 blur-3xl" style={{ animation: "dz-float 18s ease-in-out infinite reverse" }} />
      <div className="dz-anim absolute left-1/3 top-1/2 h-72 w-72 rounded-full bg-[#d6336c] opacity-25 blur-3xl" style={{ animation: "dz-float 22s ease-in-out infinite" }} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.10),transparent_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#09051a]/45 via-[#09051a]/55 to-[#09051a]/90" />
    </div>
  );
}

function CardFace({ d }: { d: Deal }) {
  const saved = Math.round(d.was - d.price);
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-neutral-900 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={d.image} alt={d.name} draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
      <span className="absolute left-4 top-4 rounded-2xl bg-gradient-to-br from-[#ff4d79] to-[#d6336c] px-3.5 py-1.5 text-xl font-black text-white shadow-lg">-{d.pct} %</span>
      <span className="absolute right-4 top-4 rounded-full bg-black/40 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/25 backdrop-blur-md">{d.retailer}</span>
      <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
        <span className="inline-block rounded-full bg-emerald-400 px-3 py-1 text-xs font-extrabold text-emerald-950">Économise {saved} $</span>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-white/60">{d.brand || d.retailer}</p>
        <h2 className="line-clamp-2 text-xl font-extrabold leading-tight text-white">{d.name}</h2>
        <div className="mt-1.5 flex items-baseline gap-2.5">
          <span className="text-3xl font-black text-white">{fmt(d.price)}</span>
          <span className="text-base text-white/50 line-through">{fmt(d.was)}</span>
        </div>
        {d.sizes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {d.sizes.slice(0, 6).map((z) => <span key={z} className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-bold text-white/90 ring-1 ring-white/20">{z}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SwipePage() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [origin, setOrigin] = useState(TR);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const group = profile.group as Group;
  const updateProfile = (p: Profile) => { setProfile(p); saveProfile(p); setSeen0(loadSeen()); setI(0); setHistory([]); setExit(null); setDrag({ x: 0, y: 0, on: false }); };
  const [geoMsg, setGeoMsg] = useState("");
  const [i, setI] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, on: false });
  const [exit, setExit] = useState<Dir | null>(null);
  const [history, setHistory] = useState<{ i: number; dir: Dir }[]>([]);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [seen0, setSeen0] = useState<Set<string> | null>(null);
  const { user, ready } = useUser();
  const [nudgeOff, setNudgeOff] = useState(false);
  const [bursts, setBursts] = useState<{ id: number; parts: { dx: number; dy: number; rot: number; e: string }[] }[]>([]);
  const burstId = useRef(0);

  function burst(kind: Dir) {
    if (kind === "left") return;
    const emoji = kind === "right" ? ["❤️", "💚", "💖"] : ["✨", "🛍️", "💸"];
    const parts = Array.from({ length: 12 }, (_, k) => ({ dx: (Math.random() - 0.5) * 280, dy: -60 - Math.random() * 240, rot: (Math.random() - 0.5) * 140, e: emoji[k % emoji.length] }));
    const id = ++burstId.current;
    setBursts((b) => [...b, { id, parts }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1000);
  }
  const [order, setOrder] = useState<Deal[]>([]);

  useEffect(() => { setSavedCount(loadSaved().length); setProfile(loadProfile()); setSeen0(loadSeen()); }, []);

  useEffect(() => {
    fetch("/deals.json").then((r) => r.json()).then(setDeals).catch(() => setLoadError(true));
    // Facultatif : sert à trouver la succursale Aubainerie la plus proche
    fetch("/stores.json")
      .then((r) => r.json())
      .then((raw: RawStore[]) =>
        setBranches(
          raw.map((s) => ({
            name: s.name, area: [s.address, s.city].filter(Boolean).join(", "), lat: s.lat, lng: s.lng,
          }))
        )
      )
      .catch(() => {});
  }, []);

  const base: Deal[] = useMemo(
    () => mixByRetailer((deals || []).filter((d) => d.image && !seen0?.has(String(d.id)) && passes(d, profile) && (group === "all" ? groupOf(d.gender) !== null : groupOf(d.gender) === group))),
    [deals, group, profile, seen0]
  );
  useEffect(() => { setOrder(personalize(base, loadTaste())); }, [base]);
  const deck: Deal[] = order.length ? order : base;

  const liked = history.filter((h) => h.dir === "right").map((h) => deck[h.i]);
  const cart = history.filter((h) => h.dir === "up").map((h) => deck[h.i]);
  const done = i >= deck.length;
  const current = deck[i];

  // Succursale la plus proche de la boutique de l'article affiché
  const nearest = useMemo(() => {
    if (!current || !branches.length) return null;
    const key = norm(current.retailer);
    const mine = branches.filter((b) => { const n = norm(b.name); return n && key && (n.includes(key) || key.includes(n)); });
    if (!mine.length) return null;
    return mine.map((b) => ({ b, km: distanceKm(origin, b) })).sort((a, c) => a.km - c.km)[0];
  }, [current, branches, origin]);

  function resetDeck() {
    setI(0); setHistory([]); setExit(null); setDrag({ x: 0, y: 0, on: false });
  }
  // « Recommencer » : on oublie ce qui a déjà été swipé et on repart du début
  function replayAll() { clearSeen(); setSeen0(new Set()); resetDeck(); }
  const changeGroup = (g: Group) => updateProfile({ ...profile, group: g });

  function useMyLocation() {
    if (!navigator.geolocation) return setGeoMsg("Ton navigateur ne gère pas la localisation.");
    setGeoMsg("Recherche de ta position…");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Ma position" }); setGeoMsg(""); },
      () => setGeoMsg("Localisation refusée : on utilise Trois-Rivières."),
      { timeout: 10000 }
    );
  }

  function decide(dir: Dir) {
    if (exit || done) return;
    const d = deck[i];
    setExit(dir);
    burst(dir);
    markSeen(d.id);
    try { navigator.vibrate?.(dir === "left" ? 8 : 18); } catch { /* pas de vibration sur cet appareil */ }
    if (dir !== "left") addSaved(d, dir === "up");
    const t = learn(d, dir === "up" ? 3 : dir === "right" ? 2 : -1);
    setSavedCount(loadSaved().length);
    setOrder((prev) => { const cur = prev.length ? prev : deck; return [...cur.slice(0, i + 4), ...personalize(cur.slice(i + 4), t)]; });
    setTimeout(() => {
      setHistory((h) => [...h, { i, dir }]);
      setI((v) => v + 1);
      setExit(null);
      setDrag({ x: 0, y: 0, on: false });
    }, 340);
  }

  function undo() {
    if (exit || history.length === 0) return;
    const last = history[history.length - 1];
    unmarkSeen(deck[last.i].id);
    if (last.dir !== "left") { removeSaved(deck[last.i].id); setSavedCount(loadSaved().length); }
    setHistory(history.slice(0, -1));
    setI(last.i);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") decide("left");
      if (e.key === "ArrowRight") decide("right");
      if (e.key === "ArrowUp") decide("up");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onDown = (e: React.PointerEvent) => {
    if (exit) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, on: true });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y, on: true });
  };
  const onUp = () => {
    if (!start.current) return;
    start.current = null;
    if (drag.x > 110) decide("right");
    else if (drag.x < -110) decide("left");
    else if (drag.y < -130) decide("up");
    else setDrag({ x: 0, y: 0, on: false });
  };

  const topTransform =
    exit === "left" ? `translate(-900px, ${drag.y - 60}px) rotate(-38deg)`
    : exit === "right" ? `translate(900px, ${drag.y - 60}px) rotate(38deg)`
    : exit === "up" ? `translate(${drag.x}px, -1000px) scale(.85)`
    : `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 14}deg) scale(${drag.on ? 1.03 : 1})`;

  const likeOp = exit === "right" ? 1 : clamp(drag.x / 100);
  const nopeOp = exit === "left" ? 1 : clamp(-drag.x / 100);
  const upOp = exit === "up" ? 1 : Math.abs(drag.y) > Math.abs(drag.x) ? clamp(-drag.y / 110) : 0;

  const total = Math.round([...liked, ...cart].reduce((sum, c) => sum + (c ? c.was - c.price : 0), 0));

  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95 ${active ? "bg-gradient-to-r from-[#753AA9] to-[#d6336c] text-white shadow-lg shadow-[#753AA9]/40" : "bg-white/10 text-white/80 ring-1 ring-white/15 backdrop-blur hover:bg-white/20"}`;

  return (
    <div className={`${inter.className} relative flex min-h-screen flex-col overflow-hidden bg-[#09051a] text-white`}>
      <AccountSync />
      <style>{DZ_CSS}</style>
      <Backdrop image={current?.image} />
      <header className="relative z-10 mx-auto flex w-full max-w-md items-center justify-between px-5 py-4">
        <Link href="/" className="text-sm font-semibold text-white/70 hover:text-white">← Retour</Link>
        <span className="bg-clip-text text-2xl font-extrabold text-transparent" style={{ backgroundImage: "linear-gradient(90deg,#c9a7ff,#39D2C0)" }}>
          Dropz. Swipe
        </span>
        <div className="flex gap-3 text-sm font-bold">
          <Link href="/favoris" className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-pink-300 ring-1 ring-white/20 backdrop-blur transition hover:ring-pink-300 active:scale-95"><Ico d={HEART} className="h-4 w-4" fill="currentColor" />{savedCount}</Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-md justify-center px-5 pb-2">
        <span key={total} className="dz-anim inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur-md"
          style={{ animation: total > 0 ? "dz-bump .45s ease-out" : undefined, opacity: total > 0 ? 1 : 0.75 }}>
          {total > 0 ? <>💰 <span className="text-emerald-300">{total} $</span> d&apos;économies repérées</> : "Swipe pour repérer des économies"}
        </span>
      </div>

      {ready && !user && !nudgeOff && history.length >= 10 && (
        <div className="relative z-10 mx-auto mb-2 w-full max-w-md px-5">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-2.5 text-xs text-white ring-1 ring-white/20 backdrop-blur-md">
            <span>Garde tes trouvailles sur tous tes appareils : crée ton compte gratuit.</span>
            <span className="flex shrink-0 items-center gap-2">
              <Link href="/connexion" className="rounded-full bg-white px-3 py-1.5 font-bold text-neutral-900">Créer</Link>
              <button onClick={() => setNudgeOff(true)} aria-label="Fermer" className="text-white/60 hover:text-white">✕</button>
            </span>
          </div>
        </div>
      )}

      <div className="relative z-10 mx-auto w-full max-w-md space-y-2 px-5">
        <div className="flex items-center gap-2">
          <button onClick={useMyLocation} className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 active:scale-95">
            <Ico d={PIN} className="h-4 w-4 text-[#753AA9]" />
            {origin.label}
          </button>
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {GROUPS.map((g) => (
              <button key={g.id} onClick={() => changeGroup(g.id)} className={chip(g.id === group)}>{g.label}</button>
            ))}
          </div>
        </div>
        {geoMsg && <p className="text-xs text-white/60">{geoMsg}</p>}
        <div className="rounded-2xl bg-white/90 p-2 text-neutral-900 backdrop-blur"><FilterBar profile={profile} onChange={updateProfile} count={deck.length} /></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-gradient-to-r from-[#753AA9] via-[#d6336c] to-[#39D2C0] transition-all duration-500" style={{ width: `${deck.length ? (i / deck.length) * 100 : 0}%` }} />
        </div>
      </div>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-6">
        {loadError ? (
          <p className="max-w-xs text-center text-sm text-white/70">Impossible de lire <code>deals.json</code>. Vérifie qu&apos;il est bien dans le dossier <code>public</code> de ton projet.</p>
        ) : !deals || !seen0 ? (
          <p className="text-sm text-white/60">Chargement des aubaines…</p>
        ) : deck.length === 0 ? (
          <div className="max-w-xs text-center">
            <h2 className="text-2xl font-extrabold">Aucune aubaine ici</h2>
            <p className="mt-2 text-sm text-white/60">Rien de nouveau avec ces filtres : soit tout a déjà été swipé, soit rien ne correspond. Reviens plus tard pour de nouvelles aubaines.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button onClick={() => updateProfile({ ...DEFAULT_PROFILE })} className="rounded-full bg-gradient-to-r from-[#753AA9] to-[#d6336c] px-6 py-3 text-sm font-semibold text-white hover:opacity-90">Effacer les filtres</button>
              <button onClick={replayAll} className="rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/20 hover:bg-white/20">Revoir ce que j&apos;ai déjà swipé</button>
            </div>
          </div>
        ) : !done ? (
          <>
            <div className="relative h-[500px] w-[340px] max-w-full select-none">
              {[2, 1, 0].map((k) => {
                const p = deck[i + k];
                if (!p) return null;
                if (k > 0) {
                  return (
                    <div key={p.id} className="absolute inset-0 transition-all duration-500 ease-out" style={{ transform: `translateY(${k * 14}px) scale(${1 - k * 0.06}) rotate(${k === 1 ? -2.5 : 2.5}deg)`, filter: `brightness(${1 - k * 0.22})`, zIndex: 10 - k }}>
                      <CardFace d={p} />
                    </div>
                  );
                }
                return (
                  <div key={p.id} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                    className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
                    style={{
                      transform: topTransform,
                      transition: drag.on && !exit ? "none" : exit ? "transform .34s cubic-bezier(.5,0,.9,.4), opacity .34s ease-in" : "transform .45s cubic-bezier(.2,1.1,.3,1)",
                      opacity: exit ? 0 : 1,
                      zIndex: 10,
                      filter: drag.on && !exit && Math.abs(drag.x) > 20 ? `drop-shadow(0 0 ${Math.min(36, Math.abs(drag.x) / 4)}px ${drag.x > 0 ? "rgba(52,211,153,.85)" : "rgba(251,113,133,.85)"})` : undefined,
                    }}>
                    <CardFace d={p} />
                    <div className="pointer-events-none absolute left-5 top-24 -rotate-12 rounded-xl border-4 border-emerald-500 bg-white/70 px-3 py-1 text-3xl font-extrabold text-emerald-500" style={{ opacity: likeOp }}>J&apos;AIME</div>
                    <div className="pointer-events-none absolute right-5 top-24 rotate-12 rounded-xl border-4 border-rose-500 bg-white/70 px-3 py-1 text-3xl font-extrabold text-rose-500" style={{ opacity: nopeOp }}>NON</div>
                    <div className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto w-fit rounded-xl border-4 border-[#753AA9] bg-white/70 px-3 py-1 text-3xl font-extrabold text-[#753AA9]" style={{ opacity: upOp }}>JE LE VEUX</div>
                  </div>
                );
              })}
              {bursts.map((b) => (
                <div key={b.id} className="pointer-events-none absolute inset-0 z-20">
                  {b.parts.map((pt, k) => (
                    <span key={k} className="dz-anim absolute left-1/2 top-1/2 text-2xl"
                      style={{ "--dx": `${pt.dx}px`, "--dy": `${pt.dy}px`, "--rot": `${pt.rot}deg`, animation: "dz-burst .95s ease-out forwards" } as React.CSSProperties}>{pt.e}</span>
                  ))}
                </div>
              ))}
            </div>

            {current && (
              <div className="mt-6 w-[340px] max-w-full space-y-2 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/20 backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-xs text-neutral-600">
                    <span className="font-semibold text-white">{current.retailer}</span>
                    {current.sizes.length > 0 && <> · Tailles : {current.sizes.join(", ")}</>}
                  </p>
                  <a href={current.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-neutral-900 transition hover:opacity-90 active:scale-95">
                    Voir l&apos;article
                  </a>
                </div>
                {nearest && (
                  <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2">
                    <p className="min-w-0 truncate text-xs text-white/60">
                      {current.retailer} la plus proche : {fmtKm(nearest.km)}{nearest.b.area ? ` · ${nearest.b.area}` : ""}
                    </p>
                    <a href={directions(nearest.b)} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-[#c9a7ff] hover:underline">Itinéraire</a>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center gap-5">
              <button onClick={undo} disabled={history.length === 0} aria-label="Revenir en arrière" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-amber-300 ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 active:scale-90 disabled:opacity-30"><Ico d={UNDO} className="h-5 w-5" /></button>
              <button onClick={() => decide("left")} aria-label="Passer" className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-rose-400 ring-1 ring-white/20 backdrop-blur transition hover:bg-rose-500 hover:text-white active:scale-90"><Ico d={X} className="h-8 w-8" /></button>
              <button onClick={() => decide("up")} aria-label="Je le veux" className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#753AA9] to-[#d6336c] text-white shadow-[0_10px_30px_-5px_rgba(117,58,169,0.8)] transition hover:scale-110 active:scale-90"><Ico d={BAG} className="h-6 w-6" /></button>
              <button onClick={() => decide("right")} aria-label="J'aime" className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_10px_30px_-5px_rgba(16,185,129,0.8)] transition hover:scale-110 active:scale-90"><Ico d={HEART} className="h-8 w-8" /></button>
            </div>
            <p className="mt-4 max-w-xs text-center text-xs text-white/60">
              Droite : j&apos;aime · Haut : je le veux · Gauche : passer. Plus tu swipes, plus on te montre ce que tu aimes. Prix et stocks en ligne : ils peuvent changer.
            </p>
          </>
        ) : (
          <div className="w-full max-w-md text-center">
            <h2 className="text-3xl font-extrabold">Tu as tout vu !</h2>
            <p className="mt-2 text-white/60">{liked.length} coup(s) de cœur · {cart.length} que tu veux</p>
            <div className="mt-6 space-y-2 text-left">
              {[...cart, ...liked].map((p, k) => (
                <div key={k} className="flex items-center gap-3 rounded-xl bg-white p-3 text-neutral-900 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt="" className="h-14 w-12 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-xs"><span className="font-bold text-[#d6336c]">{fmt(p.price)}</span> <span className="text-neutral-400 line-through">{fmt(p.was)}</span> · -{p.pct} %</p>
                  </div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-[#753AA9] hover:underline">Voir</a>
                </div>
              ))}
              {liked.length + cart.length === 0 && <p className="text-center text-sm text-white/60">Rien de sélectionné cette fois.</p>}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/favoris" className="rounded-full bg-[#753AA9] px-6 py-3 text-sm font-semibold text-white hover:opacity-90">Voir mes trouvailles</Link>
              <button onClick={replayAll} className="rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 hover:border-black">Recommencer</button>
              <Link href="/" className="rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-semibold text-neutral-900 hover:border-black">Retour à l&apos;accueil</Link>
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 pb-4 text-center text-[11px] text-white/40">
        Aubaines : sites des magasins · Magasins : © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">contributeurs OpenStreetMap</a>
      </footer>
    </div>
  );
}