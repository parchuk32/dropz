// Statistiques anonymes : on compte les swipes et les clics vers les magasins, seulement si la personne a accepté.
import { supabase, supabaseConfigured } from "./supabase";

const ANON = "dropz:anon";
const CONSENT = "dropz:consent";

export type Consent = "yes" | "no";
export type EventType = "swipe_left" | "swipe_right" | "swipe_up" | "click_out" | "save" | "unsave";

export function getConsent(): Consent | null {
  try { const v = localStorage.getItem(CONSENT); return v === "yes" || v === "no" ? v : null; } catch { return null; }
}
export function setConsent(v: Consent) {
  try { localStorage.setItem(CONSENT, v); window.dispatchEvent(new Event("dropz:consent")); } catch { /* ignoré */ }
}

// Identifiant aléatoire gardé dans le navigateur : il ne contient aucune information sur la personne
function anonId(): string {
  try {
    let id = localStorage.getItem(ANON);
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
      localStorage.setItem(ANON, id);
    }
    return id;
  } catch { return "inconnu"; }
}

type TrackDeal = { id: string | number; retailer: string; price: number };

export function track(type: EventType, d: TrackDeal) {
  if (!supabaseConfigured || typeof window === "undefined" || getConsent() !== "yes") return;
  try {
    void supabase()
      .from("events")
      .insert({ anon_id: anonId(), type, deal_id: String(d.id), retailer: d.retailer, price: d.price, path: window.location.pathname })
      .then(() => undefined, () => undefined); // un échec de statistiques ne doit jamais gêner le site
  } catch { /* ignoré */ }
}