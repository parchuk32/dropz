// Collecte quotidienne des aubaines (remplace le flux n8n) + historique des prix.
// Lancement : node scripts/collect-deals.mjs
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT = process.env.DROPZ_OUT_DIR || path.join(ROOT, "public");
const SITE = process.env.SITE_URL || "https://dropz-brown.vercel.app";
const UA = `DropzDealFinder/1.0 (+${SITE})`;

// ================= Réglages =================
const EXTRA = [ // boutiques ajoutées en plus de public/stores.json (nom + site)
  { name: "Aubainerie", origin: "https://www.aubainerie.com" },
  { name: "Pentagone", origin: "https://www.pentagone.com" },
  { name: "Hangar 29", origin: "https://hangar29.ca" },
  { name: "Ernest", origin: "https://ernest.ca" },
  { name: "Vincent d'Amérique", origin: "https://vincentdamerique.com" },
  { name: "Tristan", origin: "https://www.tristanstyle.com" },
  { name: "Amnesia", origin: "https://amnesiashop.com" },
  { name: "Empire", origin: "https://thinkempire.com" },
  { name: "Souris Mini", origin: "https://www.sourismini.com" },
  { name: "Deux par Deux", origin: "https://www.deuxpardeux.com" },
  { name: "Chaussures Pop", origin: "https://chaussurespop.com" },
  { name: "Yellow", origin: "https://www.yellowshoes.com" },
];
const DEFAULT_GENDER = { // catégorie par défaut quand le site n'en donne pas
  "reitmans.com": "Women", "laura.ca": "Women", "ardene.com": "Women", "pentagone.com": "Women", "joellecollection.com": "Women",
  "ernest.ca": "Men", "roimauriciendeshabits.com": "Men", "boutiqueqg.com": "Men",
};
const MIN_PCT = 10;
const MAX_PER_RETAILER = 150;
const MAX_SALE_COLLECTIONS = 6;
const PAGES = 2;
const PAUSE_MS = Number(process.env.DROPZ_PAUSE_MS ?? 400);
const SALE = /\b(soldes?|liquidation|clearance|outlet|rabais|promos?|sale|aubaines?)\b/i;
const today = new Date().toISOString().slice(0, 10);

// ================= Outils =================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = async (file, fallback) => { try { return JSON.parse(await fs.readFile(file, "utf8")); } catch { return fallback; } };
const clean = (s) => String(s || "").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&#038;/g, "&").replace(/&#8217;/g, "’").replace(/&#039;/g, "'").replace(/&quot;/g, '"').trim();

function inferGender(text) {
  const t = text.toLowerCase();
  if (/\b(bebe|bébé|baby|nouveau-n)/.test(t)) return "Baby";
  if (/\b(enfants?|kids?|junior)\b/.test(t)) return "Kid";
  if (/\b(ados?|teens?)\b/.test(t)) return "Teen";
  if (/\b(femmes?|women|woman|ladies|dames?)\b/.test(t)) return "Women";
  if (/\b(hommes?|men|man)\b/.test(t)) return "Men";
  return "Unisexe";
}
const genderFor = (site, text) => { const g = inferGender(text); return g === "Unisexe" && DEFAULT_GENDER[site.host] ? DEFAULT_GENDER[site.host] : g; };

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(20000), redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return JSON.parse(await res.text()); // lève une erreur si c'est une page HTML
}

// ---- Respect du robots.txt : on ne lit pas ce qu'un site interdit aux robots ----
const robotsCache = new Map();
function toRegex(rule) {
  const anchored = rule.endsWith("$");
  const body = (anchored ? rule.slice(0, -1) : rule).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + body + (anchored ? "$" : ""));
}
function parseRobots(text) {
  const rules = [];
  let agents = [];
  let sawRule = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    const val = line.slice(i + 1).trim();
    if (key === "user-agent") {
      if (sawRule) { agents = []; sawRule = false; }
      agents.push(val.toLowerCase());
    } else if (key === "disallow" || key === "allow") {
      sawRule = true;
      if (key === "disallow" && val && agents.some((a) => a === "*" || a.includes("dropz"))) rules.push(toRegex(val));
    }
  }
  return rules;
}
async function allowed(origin, pathname) {
  if (!robotsCache.has(origin)) {
    let rules = [];
    try {
      const r = await fetch(origin + "/robots.txt", { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10000) });
      if (r.ok) rules = parseRobots(await r.text());
    } catch { /* pas de robots.txt lisible : on continue */ }
    robotsCache.set(origin, rules);
  }
  return !robotsCache.get(origin).some((re) => re.test(pathname));
}
async function fetchJson(site, p) {
  if (!(await allowed(site.origin, p.split("?")[0]))) throw new Error("interdit par le robots.txt du site");
  return getJson(site.origin + p);
}

// ================= Liste des sites =================
async function loadSites() {
  if (process.env.DROPZ_SITES) {
    return JSON.parse(process.env.DROPZ_SITES).map((s) => ({ ...s, host: new URL(s.origin).host.replace(/^www\./, "") }));
  }
  const byHost = new Map();
  const add = (name, website) => {
    let u;
    try { u = new URL(/^https?:\/\//i.test(website) ? website : "https://" + website); } catch { return; }
    const host = u.hostname.replace(/^www\./, "");
    if (!byHost.has(host)) byHost.set(host, { name, host, origin: "https://" + u.hostname });
  };
  EXTRA.forEach((e) => add(e.name, e.origin));
  const stores = await readJson(path.join(ROOT, "public", "stores.json"), []);
  stores.forEach((s) => s.website && add(s.name, s.website));
  return [...byHost.values()];
}

async function detect(site) {
  try { const r = await fetchJson(site, "/products.json?limit=1"); if (r && Array.isArray(r.products)) return "shopify"; } catch { /* essai suivant */ }
  try { const r = await fetchJson(site, "/wp-json/wc/store/v1/products?per_page=1"); if (Array.isArray(r)) return "woocommerce"; } catch { /* non supporté */ }
  return null;
}

// ================= Shopify =================
async function shopifyDeals(site) {
  const mine = [];
  const seen = new Set();
  const consider = (p, collTitle) => {
    if (seen.has(p.id)) return;
    seen.add(p.id);
    let best = null;
    for (const v of p.variants || []) {
      const price = parseFloat(v.price), was = parseFloat(v.compare_at_price);
      if (!(was > price)) continue;
      const pct = Math.round((1 - price / was) * 100);
      if (!best || pct > best.pct) best = { price, was, pct };
    }
    if (!best || best.pct < MIN_PCT) return;
    if (!(p.variants || []).some((v) => v.available)) return;
    const image = p.images && p.images[0] ? p.images[0].src : (p.image && p.image.src) || "";
    if (!image) return;
    const sizeIdx = (p.options || []).findIndex((o) => /taille|size|pointure/i.test(o.name));
    const sizes = sizeIdx < 0 ? [] : [...new Set((p.variants || []).filter((v) => v.available).map((v) => v["option" + (sizeIdx + 1)]).filter(Boolean))];
    const tags = Array.isArray(p.tags) ? p.tags : String(p.tags || "").split(",").map((x) => x.trim());
    const genderTag = tags.find((t) => t.startsWith("gender:"));
    mine.push({
      retailer: site.name, id: `${site.host}-${p.id}`, name: clean(p.title), brand: p.vendor || "",
      price: best.price, was: best.was, pct: best.pct, sizes,
      gender: genderTag ? genderTag.replace("gender:", "") : genderFor(site, `${tags.join(" ")} ${p.product_type || ""} ${p.title} ${collTitle}`),
      image, url: `${site.origin}/products/${p.handle}`, collection: collTitle, date: p.published_at || "",
    });
  };

  const cols = [];
  for (let page = 1; page <= 2; page++) {
    let r;
    try { r = await fetchJson(site, `/collections.json?limit=250&page=${page}`); } catch { break; }
    const list = (r && r.collections) || [];
    cols.push(...list);
    if (list.length < 250) break;
  }
  const sale = cols.filter((c) => SALE.test(c.title) && c.products_count > 0).sort((a, b) => b.products_count - a.products_count).slice(0, MAX_SALE_COLLECTIONS);
  const sources = sale.length
    ? sale.map((c) => ({ base: `/collections/${c.handle}/products.json`, title: c.title }))
    : [{ base: "/products.json", title: "" }];
  for (const src of sources) {
    for (let page = 1; page <= PAGES; page++) {
      let r;
      try { r = await fetchJson(site, `${src.base}?limit=250&page=${page}`); } catch { break; }
      const products = (r && r.products) || [];
      if (!products.length) break;
      products.forEach((p) => consider(p, src.title));
      if (products.length < 250) break;
      await sleep(PAUSE_MS);
    }
    await sleep(PAUSE_MS);
  }
  return mine;
}

// ================= WooCommerce (API publique « Store API ») =================
async function wooDeals(site) {
  const mine = [];
  for (let page = 1; page <= 3; page++) {
    let r;
    try { r = await fetchJson(site, `/wp-json/wc/store/v1/products?on_sale=true&per_page=100&page=${page}`); } catch { break; }
    if (!Array.isArray(r) || !r.length) break;
    for (const p of r) {
      const pr = p.prices || {};
      const div = Math.pow(10, pr.currency_minor_unit != null ? pr.currency_minor_unit : 2);
      const price = parseFloat(pr.price) / div, was = parseFloat(pr.regular_price) / div;
      if (!(was > price)) continue;
      const pct = Math.round((1 - price / was) * 100);
      if (pct < MIN_PCT || p.is_in_stock === false) continue;
      const image = p.images && p.images[0] ? p.images[0].src : "";
      if (!image) continue;
      const sizeAttr = (p.attributes || []).find((a) => /taille|size|pointure/i.test(a.name));
      const cats = (p.categories || []).map((c) => c.name).join(" ");
      mine.push({
        retailer: site.name, id: `${site.host}-${p.id}`, name: clean(p.name), brand: (p.brands && p.brands[0] && p.brands[0].name) || "",
        price, was, pct, sizes: sizeAttr ? (sizeAttr.terms || []).map((t) => t.name) : [],
        gender: genderFor(site, `${cats} ${p.name}`), image, url: p.permalink, collection: clean(cats), date: "",
      });
    }
    if (r.length < 100) break;
    await sleep(PAUSE_MS);
  }
  return mine;
}

// ================= Historique des prix =================
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

function updateHistory(hist, deals) {
  for (const d of deals) {
    const h = hist[d.id] || (hist[d.id] = { first: today, last: today, points: [] });
    h.last = today;
    const lastPoint = h.points[h.points.length - 1];
    if (!lastPoint || lastPoint[1] !== d.price) h.points.push([today, d.price]); // on ne note que les changements de prix
  }
  for (const id of Object.keys(hist)) { // ménage : articles disparus depuis 60 jours
    if (daysBetween(hist[id].last, today) > 60) delete hist[id];
  }
}

// Ajoute des repères sur chaque aubaine, calculés avec NOS observations (jamais avec les dires du magasin)
function annotate(d, h) {
  const prices = h.points.map((p) => p[1]);
  const min = Math.min(...prices), max = Math.max(...prices);
  const tracked = daysBetween(h.first, today);
  if (tracked > 0) d.tracked = tracked;
  if (prices.length >= 2 && d.price <= min && max > min) d.low = true;              // plus bas prix que nous ayons vu
  if (h.points.length >= 2) {
    const [lastDate, , ] = h.points[h.points.length - 1];
    const prev = h.points[h.points.length - 2][1];
    if (prev > d.price && daysBetween(lastDate, today) <= 14) d.drop = Math.round((prev - d.price) * 100) / 100; // baisse récente
  }
}

// ================= Programme principal =================
async function main() {
  const sites = await loadSites();
  console.log(`${sites.length} sites à examiner`);

  for (let i = 0; i < sites.length; i += 6) {
    const batch = sites.slice(i, i + 6);
    const res = await Promise.all(batch.map(detect));
    batch.forEach((s, k) => { s.platform = res[k]; });
    await sleep(300);
  }

  const deals = [];
  const report = [];
  for (const s of sites) {
    if (!s.platform) { report.push(`- ${s.name} : plateforme non lisible (ou interdite par robots.txt)`); continue; }
    let mine = [];
    try { mine = s.platform === "shopify" ? await shopifyDeals(s) : await wooDeals(s); }
    catch (e) { report.push(`- ${s.name} : erreur ${e.message}`); continue; }
    mine.sort((a, b) => b.pct - a.pct);
    deals.push(...mine.slice(0, MAX_PER_RETAILER));
    report.push(`- ${s.name} (${s.platform}) : ${mine.length} aubaines`);
  }
  console.log(report.join("\n"));

  // Sécurité : si la collecte a presque tout raté (site bloqué, panne), on ne remplace pas le bon fichier
  const prev = await readJson(path.join(OUT, "deals.json"), []);
  if (deals.length === 0 || (prev.length > 100 && deals.length < prev.length * 0.5)) {
    console.error(`Collecte suspecte : ${deals.length} aubaines (avant : ${prev.length}). Fichiers non modifiés.`);
    process.exit(1);
  }

  const hist = await readJson(path.join(OUT, "price-history.json"), {});
  updateHistory(hist, deals);
  deals.forEach((d) => annotate(d, hist[d.id]));
  deals.sort((a, b) => b.pct - a.pct);

  await fs.mkdir(OUT, { recursive: true });
  await fs.writeFile(path.join(OUT, "deals.json"), JSON.stringify(deals));
  await fs.writeFile(path.join(OUT, "price-history.json"), JSON.stringify(hist));
  await fs.writeFile(path.join(OUT, "meta.json"), JSON.stringify({ updatedAt: new Date().toISOString(), count: deals.length }));
  console.log(`OK : ${deals.length} aubaines, historique de ${Object.keys(hist).length} articles.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
