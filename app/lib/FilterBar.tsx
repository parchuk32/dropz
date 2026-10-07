"use client";

import { useState } from "react";
import { BUDGETS, NUM_SIZES, PCTS, SIZES, TYPES, hasActiveFilters, type Profile } from "./filters-core";

const chip = (on: boolean) =>
  `shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${on ? "border-[#753AA9] bg-[#753AA9] text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-[#753AA9]"}`;

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function FilterBar({ profile, onChange, count }: { profile: Profile; onChange: (p: Profile) => void; count: number }) {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<Profile>) => onChange({ ...profile, ...patch });
  const active = hasActiveFilters(profile);

  const summary: { key: string; label: string; clear: () => void }[] = [];
  if (profile.sizes.length) summary.push({ key: "s", label: `Taille ${profile.sizes.join(", ")}`, clear: () => set({ sizes: [] }) });
  if (profile.types.length)
    summary.push({ key: "t", label: profile.types.map((t) => TYPES.find((x) => x.id === t)?.label || t).join(", "), clear: () => set({ types: [] }) });
  if (profile.maxPrice != null) summary.push({ key: "p", label: `Max ${profile.maxPrice} $`, clear: () => set({ maxPrice: null }) });
  if (profile.minPct != null) summary.push({ key: "r", label: `-${profile.minPct} % et plus`, clear: () => set({ minPct: null }) });

  return (
    <div>
      <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button onClick={() => setOpen(!open)} className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold ${active ? "bg-neutral-900 text-white" : "border border-neutral-300 bg-white text-neutral-800 hover:border-neutral-900"}`}>
          {profile.sizes.length ? `Ma taille : ${profile.sizes.join(", ")}` : "Ma taille et filtres"} {open ? "▲" : "▼"}
        </button>
        {summary.map((c) => (
          <button key={c.key} onClick={c.clear} className="shrink-0 rounded-full bg-[#f3edfa] px-3 py-1.5 text-xs font-semibold text-[#753AA9]">
            {c.label} ✕
          </button>
        ))}
        <span className="ml-auto shrink-0 pl-2 text-xs font-semibold text-neutral-500">{count} aubaine{count > 1 ? "s" : ""}</span>
      </div>

      {open && (
        <div className="mt-2 space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-lg">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Ma taille (on s&apos;en souvient)</p>
            <div className="flex flex-wrap gap-1.5">
              {SIZES.map((s) => <button key={s} onClick={() => set({ sizes: toggle(profile.sizes, s) })} className={chip(profile.sizes.includes(s))}>{s}</button>)}
            </div>
            <p className="mb-1 mt-3 text-[11px] text-neutral-500">Pointure, pantalon ou âge</p>
            <div className="flex flex-wrap gap-1.5">
              {NUM_SIZES.map((s) => <button key={s} onClick={() => set({ sizes: toggle(profile.sizes, s) })} className={chip(profile.sizes.includes(s))}>{s}</button>)}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Je cherche</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((t) => <button key={t.id} onClick={() => set({ types: toggle(profile.types, t.id) })} className={chip(profile.types.includes(t.id))}>{t.label}</button>)}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Budget maximum</p>
              <div className="flex flex-wrap gap-1.5">
                {BUDGETS.map((b) => <button key={b} onClick={() => set({ maxPrice: profile.maxPrice === b ? null : b })} className={chip(profile.maxPrice === b)}>{b} $</button>)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Rabais minimum</p>
              <div className="flex flex-wrap gap-1.5">
                {PCTS.map((r) => <button key={r} onClick={() => set({ minPct: profile.minPct === r ? null : r })} className={chip(profile.minPct === r)}>-{r} %</button>)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
            <button onClick={() => set({ sizes: [], types: [], maxPrice: null, minPct: null })} disabled={!active} className="text-xs font-semibold text-neutral-500 hover:text-rose-600 disabled:opacity-40">Tout effacer</button>
            <button onClick={() => setOpen(false)} className="rounded-full bg-neutral-900 px-5 py-2 text-xs font-bold text-white hover:opacity-90">Voir les {count} aubaines</button>
          </div>
        </div>
      )}
    </div>
  );
}