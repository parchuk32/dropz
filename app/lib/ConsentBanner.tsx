"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConsent, setConsent } from "./track";

// Bandeau de choix pour les statistiques anonymes. Tant que la personne n'a pas répondu, rien n'est compté.
export default function ConsentBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(getConsent() === null); }, []);
  if (!show) return null;

  const choose = (v: "yes" | "no") => { setConsent(v); setShow(false); };
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl bg-neutral-900 p-4 text-sm text-white shadow-2xl ring-1 ring-white/10 sm:flex-row sm:items-center">
        <p className="flex-1 text-white/90">
          Pour améliorer Dropz, on compte de façon anonyme les swipes et les clics vers les magasins. Aucun nom ni courriel n&apos;y est associé.{" "}
          <Link href="/confidentialite" className="underline hover:text-white">En savoir plus</Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => choose("no")} className="rounded-full px-4 py-2 font-semibold text-white/80 ring-1 ring-white/30 hover:bg-white/10">Refuser</button>
          <button onClick={() => choose("yes")} className="rounded-full bg-white px-4 py-2 font-bold text-neutral-900 hover:opacity-90">Accepter</button>
        </div>
      </div>
    </div>
  );
}