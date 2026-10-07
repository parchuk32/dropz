// Filtres de Dropz : taille, type de vêtement, budget, rabais. Le choix est gardé dans le navigateur.
export type GroupId = "all" | "femme" | "homme" | "ado" | "enfant" | "bebe";
export type Profile = { group: GroupId; sizes: string[]; types: string[]; maxPrice: number | null; minPct: number | null };

export const DEFAULT_PROFILE: Profile = { group: "all", sizes: [], types: [], maxPrice: null, minPct: null };
export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
export const NUM_SIZES = ["2", "4", "6", "8", "10", "12", "14", "28", "30", "32", "34", "36", "38", "40", "42", "44", "46"];
export const TYPES: { id: string; label: string }[] = [
  { id: "hauts", label: "Hauts" }, { id: "bas", label: "Bas" }, { id: "robes", label: "Robes" },
  { id: "manteaux", label: "Manteaux" }, { id: "chaussures", label: "Chaussures" },
  { id: "accessoires", label: "Accessoires" }, { id: "intime", label: "Maillots et sous-vêtements" },
];
export const BUDGETS = [25, 50, 100, 200];
export const PCTS = [30, 50, 70];

// Devine le type de vêtement d'après le nom (les magasins ne le donnent pas toujours)
export function typeOf(name: string): string {
  const t = name.toLowerCase();
  if (/robe|dress|gown|combinaison|jumpsuit|romper/.test(t)) return "robes";
  if (/soulier|botte|bottillon|sandale|basket|chaussure|sneaker|\bshoes?\b|\bboots?\b|pantoufle|espadrille|escarpin|slipper|runner|\bmules?\b/.test(t)) return "chaussures";
  if (/manteau|veste|parka|doudoune|pardessus|imperm|\bcoat\b|jacket|blouson|anorak|trench|puffer|\bcape\b|habit de neige|snowsuit/.test(t)) return "manteaux";
  if (/tights|maillot|bikini|sous-v|boxer|soutien|culotte|pyjama|lingerie|\bbra\b|panty|swim|\bbrief|chaussette|\bsocks?\b|collant|nuisette|robe de chambre|bralette/.test(t)) return "intime";
  if (/skort|pantalon|jean|short|jupe|legging|jogging|jogger|cargo|bermuda|\bpants?\b|skirt|trouser|capri|salopette|surv[eê]t|chino/.test(t)) return "bas";
  if (/t-shirt|\btees?\b|chandail|chemisier|chemise|blouse|camisole|\btops?\b|\bpull\b|ouat|hoodie|sweat|polo|cardigan|tricot|d[eé]bardeur|\btank\b|shirt|sweater|tunique|bodysuit|\bcrop\b|\bknit\b|henley|kimono|veston|blazer|gilet/.test(t)) return "hauts";
  if (/anneau|serre-t|barrette|pince|pendentif|breloque|\bpouch\b|porte-cl|porte-carte|\bjewel|casquette|tuque|chapeau|\bgants?\b|mitaine|foulard|cache-cou|[eé]charpe|\bsacs?\b|ceinture|collier|boucles? d|bijou|lunette|bracelet|bague|necklace|earring|\brings?\b|\bhats?\b|\bcaps?\b|scarf|\bbelts?\b|\bbags?\b|wallet|portefeuille|montre|cravate|bandeau|sunglass|parapluie|valise|bagage|pochette|backpack|tote|beanie/.test(t)) return "accessoires";
  return "autre";
}

const SIZE_MAP: Record<string, string> = {
  TTP: "XXS", TP: "XS", P: "S", G: "L", TG: "XL", TTG: "XXL",
  XXS: "XXS", XS: "XS", S: "S", M: "M", L: "L", XL: "XL", XXL: "XXL", "2XL": "XXL", "3XL": "XXXL",
  SMALL: "S", MEDIUM: "M", LARGE: "L", "X-SMALL": "XS", "X-LARGE": "XL", "XX-LARGE": "XXL",
};
export function sizeKeys(s: string): string[] {
  const clean = String(s).toUpperCase().replace(/\s/g, "");
  if (/^\d+(\.\d+)?$/.test(clean)) return [clean]; // pointure, pantalon, âge : on compare tel quel
  if (SIZE_MAP[clean]) return [SIZE_MAP[clean]];
  return clean.split(/[\/,]/).map((p) => SIZE_MAP[p]).filter(Boolean);
}

type Filterable = { name: string; sizes: string[]; price: number; pct: number };
export function passes(d: Filterable, p: Profile): boolean {
  if (p.maxPrice != null && d.price > p.maxPrice) return false;
  if (p.minPct != null && d.pct < p.minPct) return false;
  const type = typeOf(d.name);
  if (p.types.length && !p.types.includes(type)) return false;
  if (p.sizes.length) {
    if (d.sizes.length === 0) return type === "accessoires"; // pas de taille à vérifier
    return d.sizes.some((s) => sizeKeys(s).some((k) => p.sizes.includes(k)));
  }
  return true;
}

export const hasActiveFilters = (p: Profile) => p.sizes.length > 0 || p.types.length > 0 || p.maxPrice != null || p.minPct != null;

const KEY = "dropz:profile";
export function loadProfile(): Profile {
  try { const v = localStorage.getItem(KEY); return v ? { ...DEFAULT_PROFILE, ...JSON.parse(v) } : DEFAULT_PROFILE; } catch { return DEFAULT_PROFILE; }
}
export function saveProfile(p: Profile) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignoré */ }
}