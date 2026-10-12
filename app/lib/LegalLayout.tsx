import Link from "next/link";
import type { ReactNode } from "react";
import { UPDATED, legalConfigured } from "./legal";

export default function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {!legalConfigured && (
        <div className="bg-rose-600 px-4 py-2 text-center text-xs font-bold text-white">
          À compléter : ouvre app/lib/legal.ts et remplace les trois lignes « CHANGE-MOI ».
        </div>
      )}
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link href="/" className="text-sm font-semibold text-neutral-600 hover:text-black">← Retour au site</Link>
        <Link href="/" className="bg-clip-text text-2xl font-extrabold text-transparent" style={{ backgroundImage: "linear-gradient(90deg,#753AA9,#39D2C0)" }}>Dropz.</Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-20">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-neutral-500">Dernière mise à jour : {UPDATED}</p>
        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-neutral-700 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-neutral-900 [&_a]:font-semibold [&_a]:text-[#753AA9] [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
        <p className="mt-12 flex gap-4 border-t border-neutral-200 pt-6 text-sm">
          <Link href="/confidentialite" className="font-semibold text-neutral-600 underline hover:text-black">Confidentialité</Link>
          <Link href="/conditions" className="font-semibold text-neutral-600 underline hover:text-black">Conditions d&apos;utilisation</Link>
        </p>
      </main>
    </div>
  );
}