// Synchronise les données du navigateur (trouvailles, goûts, articles vus, filtres) avec le compte Supabase.
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "./supabase";

const KEYS = { saved: "dropz:saved", taste: "dropz:taste", seen: "dropz:seen", profile: "dropz:profile", meta: "dropz:sync" } as const;

type SavedLite = { id: string | number; savedAt: number } & Record<string, unknown>;
type Taste = { brand: Record<string, number>; retailer: Record<string, number>; gender: Record<string, number>; swipes: number };
type Blob = { saved: SavedLite[]; taste: Taste; seen: Record<string, number>; profile: Record<string, unknown> };
const EMPTY_TASTE: Taste = { brand: {}, retailer: {}, gender: {}, swipes: 0 };

function rd<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
// Écriture « silencieuse » : ne déclenche pas d'envoi vers le compte
function wr(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignoré */ }
}

const readLocal = (): Blob => ({
  saved: rd<SavedLite[]>(KEYS.saved, []),
  taste: { ...EMPTY_TASTE, ...rd<Partial<Taste>>(KEYS.taste, {}) },
  seen: rd<Record<string, number>>(KEYS.seen, {}),
  profile: rd<Record<string, unknown>>(KEYS.profile, {}),
});
const writeLocal = (b: Blob) => { wr(KEYS.saved, b.saved); wr(KEYS.taste, b.taste); wr(KEYS.seen, b.seen); wr(KEYS.profile, b.profile); };
const fingerprint = (b: Blob) => JSON.stringify([b.saved.map((s) => String(s.id)).sort(), b.taste.swipes, Object.keys(b.seen).length, b.profile]);

function maxMerge(a: Record<string, number> = {}, b: Record<string, number> = {}) {
  const out = { ...a };
  for (const k of Object.keys(b)) out[k] = k in out ? Math.max(out[k], b[k]) : b[k];
  return out;
}
// Première connexion sur cet appareil : on garde le meilleur des deux côtés
function mergeBlobs(a: Blob, b: Blob): Blob {
  const map = new Map<string, SavedLite>();
  [...a.saved, ...b.saved].forEach((s) => {
    const k = String(s.id);
    const cur = map.get(k);
    if (!cur || (s.savedAt || 0) > (cur.savedAt || 0)) map.set(k, s);
  });
  return {
    saved: [...map.values()].sort((x, y) => (y.savedAt || 0) - (x.savedAt || 0)),
    taste: {
      brand: maxMerge(a.taste.brand, b.taste.brand), retailer: maxMerge(a.taste.retailer, b.taste.retailer),
      gender: maxMerge(a.taste.gender, b.taste.gender), swipes: Math.max(a.taste.swipes, b.taste.swipes),
    },
    seen: maxMerge(a.seen, b.seen),
    profile: Object.keys(a.profile).length ? a.profile : b.profile,
  };
}

let started = false;
let applying = false;
let pulling = false;
let userId: string | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

async function push() {
  if (!userId) return;
  const b = readLocal();
  const at = new Date().toISOString();
  const { error } = await supabase().from("user_data").upsert({ user_id: userId, saved: b.saved, taste: b.taste, seen: b.seen, profile: b.profile, updated_at: at });
  if (!error) wr(KEYS.meta, { uid: userId, at: Date.parse(at) });
}

function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem("dropz:reload") || 0);
    if (Date.now() - last < 15000) return;
    sessionStorage.setItem("dropz:reload", String(Date.now()));
  } catch { /* ignoré */ }
  location.reload();
}

async function pull() {
  if (!userId || pulling) return;
  pulling = true;
  applying = true;
  const before = fingerprint(readLocal());
  try {
    const { data: row, error } = await supabase().from("user_data").select("saved,taste,seen,profile,updated_at").eq("user_id", userId).maybeSingle();
    if (error) return;
    const local = readLocal();
    if (!row) { await push(); return; }
    const cloud: Blob = {
      saved: row.saved ?? [], taste: { ...EMPTY_TASTE, ...(row.taste ?? {}) }, seen: row.seen ?? {}, profile: row.profile ?? {},
    };
    const meta = rd<{ uid: string; at: number } | null>(KEYS.meta, null);
    if (!meta || meta.uid !== userId) {
      writeLocal(mergeBlobs(local, cloud)); await push();
    } else if (Date.parse(row.updated_at) > meta.at + 1000) {
      writeLocal(cloud); wr(KEYS.meta, { uid: userId, at: Date.parse(row.updated_at) });
    } else if (fingerprint(local) !== fingerprint(cloud)) {
      await push();
    }
  } finally {
    applying = false;
    pulling = false;
  }
  if (fingerprint(readLocal()) !== before) reloadOnce();
}

export function initSync() {
  if (started || !supabaseConfigured || typeof window === "undefined") return;
  started = true;
  const sb = supabase();
  sb.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
    userId = data.session?.user.id ?? null;
    if (userId) void pull();
  });
  sb.auth.onAuthStateChange((_event: string, session: Session | null) => {
    const id = session?.user.id ?? null;
    if (id !== userId) {
      userId = id;
      if (id) setTimeout(() => void pull(), 0); // pas d'appel direct dans ce rappel : ça peut bloquer
    }
  });
  // À chaque changement local, on envoie au compte (en groupant les changements rapprochés)
  window.addEventListener("dropz:changed", () => {
    if (applying || !userId) return;
    clearTimeout(timer);
    timer = setTimeout(() => void push(), 1500);
  });
}