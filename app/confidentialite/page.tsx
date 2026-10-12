"use client";

import { useEffect, useState } from "react";
import LegalLayout from "../lib/LegalLayout";
import { CONTACT_EMAIL, EXPLOITANT, RESPONSABLE } from "../lib/legal";
import { getConsent, setConsent, type Consent } from "../lib/track.ts";

function ConsentControl() {
  const [c, setC] = useState<Consent | null>(null);
  useEffect(() => { setC(getConsent()); }, []);
  const pick = (v: Consent) => { setConsent(v); setC(v); };
  const btn = (on: boolean) => `rounded-full px-4 py-2 text-sm font-bold ${on ? "bg-neutral-900 text-white" : "border border-neutral-300 text-neutral-700 hover:border-neutral-900"}`;
  return (
    <div className="rounded-2xl bg-neutral-50 p-4">
      <p className="text-sm font-semibold text-neutral-900">Statistiques anonymes : {c === "yes" ? "acceptées" : c === "no" ? "refusées" : "pas encore de choix"}</p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => pick("yes")} className={btn(c === "yes")}>Accepter</button>
        <button onClick={() => pick("no")} className={btn(c === "no")}>Refuser</button>
      </div>
    </div>
  );
}

export default function Confidentialite() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <p>
        Cette page explique quels renseignements Dropz recueille, pourquoi, et comment tu peux garder le contrôle. Le site est exploité par <strong>{EXPLOITANT}</strong>.
      </p>

      <h2>1. Ce que fait Dropz</h2>
      <p>Dropz regroupe des aubaines trouvées sur les sites de magasins et te renvoie vers eux. Dropz ne vend rien et ne prend aucun paiement.</p>

      <h2>2. Les renseignements recueillis</h2>
      <ul>
        <li><strong>Sans compte :</strong> ta taille, tes filtres, tes trouvailles, les articles que tu as déjà vus et les goûts appris par le Swipe sont gardés <em>dans ton navigateur</em>, sur ton appareil. Dropz ne les reçoit pas.</li>
        <li><strong>Avec un compte :</strong> ton adresse courriel et ton mot de passe (conservé sous forme chiffrée, jamais lisible), ainsi qu&apos;une copie des données ci-dessus pour qu&apos;elles te suivent d&apos;un appareil à l&apos;autre.</li>
        <li><strong>Statistiques anonymes, seulement si tu les acceptes :</strong> le type d&apos;action (swipe, sauvegarde, clic vers un magasin), l&apos;article, la boutique, le prix, la page visitée et un identifiant aléatoire gardé dans ton navigateur. Cet identifiant ne contient ni ton nom ni ton courriel, et il n&apos;est pas relié à ton compte.</li>
        <li><strong>Données techniques de base</strong> (adresse IP, type d&apos;appareil et de navigateur), reçues automatiquement par nos hébergeurs dans leurs journaux de fonctionnement.</li>
      </ul>
      <ConsentControl />

      <h2>3. Pourquoi on les utilise</h2>
      <ul>
        <li>Faire fonctionner le site, ton compte et la synchronisation de tes trouvailles.</li>
        <li>Comprendre ce qui est utile (quelles aubaines intéressent les gens) et savoir combien de visiteurs sont envoyés vers chaque magasin.</li>
      </ul>
      <p>On ne vend pas tes renseignements et on n&apos;affiche pas de publicité ciblée.</p>

      <h2>4. Avec qui ils sont partagés</h2>
      <ul>
        <li><strong>Supabase</strong> : base de données et connexion aux comptes.</li>
        <li><strong>Vercel</strong> : hébergement du site.</li>
        <li><strong>Les magasins</strong> : quand tu cliques sur un article, tu quittes Dropz et la politique du magasin s&apos;applique. De plus, les photos des articles sont chargées depuis les serveurs des magasins, qui peuvent voir ton adresse IP à ce moment.</li>
      </ul>
      <p>Tes renseignements peuvent être hébergés à l&apos;extérieur du Québec, selon l&apos;emplacement des serveurs de ces fournisseurs.</p>

      <h2>5. Combien de temps on les garde</h2>
      <ul>
        <li>Les données de ton compte sont gardées tant que ton compte existe.</li>
        <li>Les statistiques anonymes sont gardées 24 mois au maximum.</li>
      </ul>

      <h2>6. Tes droits</h2>
      <p>
        Tu peux demander d&apos;accéder à tes renseignements, de les corriger, de les supprimer (y compris ton compte) ou de retirer ton consentement aux statistiques, en tout temps. Écris à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : nous répondrons dans un délai de 30 jours. Tu peux aussi changer ton choix pour les statistiques avec les boutons plus haut sur cette page.
      </p>
      <p>Personne responsable de la protection des renseignements personnels : <strong>{RESPONSABLE}</strong>, <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>

      <h2>7. Cookies et stockage local</h2>
      <p>Dropz utilise le stockage de ton navigateur pour le strict nécessaire (ta session de connexion, ta taille, tes trouvailles) et, si tu l&apos;acceptes, pour l&apos;identifiant anonyme des statistiques. Tu peux les effacer en tout temps dans les réglages de ton navigateur.</p>

      <h2>8. Sécurité</h2>
      <p>Les échanges avec le site sont chiffrés (https), les mots de passe sont stockés sous forme chiffrée et chaque compte ne peut lire que ses propres données. Aucune méthode n&apos;est parfaite : si un incident touchait tes renseignements, nous t&apos;en informerions comme la loi l&apos;exige.</p>

      <h2>9. Changements</h2>
      <p>Si cette politique change de façon importante, la date de mise à jour en haut de la page sera modifiée.</p>
    </LegalLayout>
  );
}