// Mémoire locale de Dropz (dans le navigateur de la personne) : trouvailles sauvegardées + goûts appris au Swipe.
export type Item = {
  id: string | number; retailer: string; name: string; brand: string; image: string; url: string;
  price: number; was: number; gender: string;
};
export type Saved = Item & { priceAtSave: number; savedAt: number; want: boolean };
export type Taste = { brand: Record<string, number>; retailer: Record<string, number>; gender: Record<string, number>; swipes: number };

const SAVED = "dropz:saved";
const TASTE = "dropz:taste";

function read<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function write(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage plein ou bloqué : on ignore */ }
}

function notify() {
  try { window.dispatchEvent(new Event("dropz:saved")); } catch { /* ignoré */ }
}

export const loadSaved = (): Saved[] => read<Saved[]>(SAVED, []);

export function addSaved(d: Item, want: boolean): Saved[] {
  const list = loadSaved().filter((s) => String(s.id) !== String(d.id));
  list.unshift({
    id: d.id, retailer: d.retailer, name: d.name, brand: d.brand, image: d.image, url: d.url,
    price: d.price, was: d.was, gender: d.gender, priceAtSave: d.price, savedAt: Date.now(), want,
  });
  write(SAVED, list);
  notify();
  return list;
}

export function removeSaved(id: string | number): Saved[] {
  const list = loadSaved().filter((s) => String(s.id) !== String(id));
  write(SAVED, list);
  notify();
  return list;
}

// Articles déjà vus au Swipe : on ne les remontre pas pendant 7 jours
const SEEN = "dropz:seen";
const SEEN_TTL = 7 * 24 * 3600 * 1000;
export function loadSeen(): Set<string> {
  const m = read<Record<string, number>>(SEEN, {});
  const now = Date.now();
  return new Set(Object.keys(m).filter((k) => now - m[k] < SEEN_TTL));
}
export function markSeen(id: string | number) {
  const m = read<Record<string, number>>(SEEN, {});
  const now = Date.now();
  for (const k of Object.keys(m)) if (now - m[k] >= SEEN_TTL) delete m[k];
  m[String(id)] = now;
  write(SEEN, m);
}
export function unmarkSeen(id: string | number) {
  const m = read<Record<string, number>>(SEEN, {});
  delete m[String(id)];
  write(SEEN, m);
}
export const clearSeen = () => write(SEEN, {});

export const loadTaste = (): Taste => read<Taste>(TASTE, { brand: {}, retailer: {}, gender: {}, swipes: 0 });

/** Apprend de chaque swipe : delta > 0 si aimé, < 0 si passé. */
export function learn(d: Item, delta: number): Taste {
  const t = loadTaste();
  const bump = (o: Record<string, number>, k: string, v: number) => { if (k) o[k] = (o[k] || 0) + v; };
  bump(t.brand, d.brand, delta);
  bump(t.retailer, d.retailer, delta * 0.5);
  bump(t.gender, d.gender, delta * 0.7);
  t.swipes += 1;
  write(TASTE, t);
  return t;
}

export const affinity = (d: Item, t: Taste): number =>
  (t.brand[d.brand] || 0) + (t.retailer[d.retailer] || 0) + (t.gender[d.gender] || 0);