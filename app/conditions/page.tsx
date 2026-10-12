import LegalLayout from "../lib/LegalLayout";
import { CONTACT_EMAIL, EXPLOITANT } from "../lib/legal";
import Link from "next/link";

export default function Conditions() {
  return (
    <LegalLayout title="Conditions d'utilisation">
      <p>En utilisant Dropz, exploité par <strong>{EXPLOITANT}</strong>, tu acceptes les conditions ci-dessous.</p>

      <h2>1. Ce qu&apos;est Dropz</h2>
      <p>Dropz est un site qui regroupe des aubaines trouvées sur les sites de magasins et te renvoie vers eux. <strong>Dropz ne vend aucun article.</strong> Tout achat se fait sur le site du magasin, selon ses propres conditions, son prix, ses taxes, sa livraison et sa politique de retour.</p>

      <h2>2. Exactitude de l&apos;information</h2>
      <ul>
        <li>Les articles, prix, rabais, tailles et stocks proviennent des sites des magasins et sont recueillis automatiquement. Ils peuvent être inexacts, incomplets ou en retard.</li>
        <li><strong>Vérifie toujours le prix et la disponibilité sur le site du magasin avant d&apos;acheter.</strong> Un article affiché en ligne n&apos;est pas forcément disponible en magasin.</li>
        <li>Le « rabais » affiché est la comparaison indiquée par le magasin entre son ancien prix et son prix actuel. Les mentions comme « Plus bas prix suivi » ou « Baisse de… » sont calculées d&apos;après les prix que Dropz a lui-même observés, sur une période limitée, et ne garantissent pas qu&apos;un prix est le meilleur du marché.</li>
      </ul>

      <h2>3. Liens et commissions</h2>
      <p>Dropz peut recevoir une commission quand tu achètes après avoir cliqué sur certains liens, sans frais supplémentaires pour toi. Ces liens seront clairement identifiés. Au moment de la dernière mise à jour de ces conditions, Dropz ne reçoit aucune commission.</p>

      <h2>4. Marques, photos et propriété intellectuelle</h2>
      <p>Les noms, marques et photos appartiennent à leurs propriétaires. Dropz n&apos;est pas affilié aux magasins mentionnés, sauf indication contraire. Si tu es propriétaire d&apos;un magasin ou d&apos;une marque et que tu souhaites retirer des articles ou des photos, écris à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : nous les retirerons rapidement.</p>

      <h2>5. Ton compte</h2>
      <p>Le compte est facultatif. Tu es responsable de garder ton mot de passe confidentiel. Nous pouvons suspendre un compte en cas d&apos;abus. Tu peux demander la suppression de ton compte en tout temps (voir la <Link href="/confidentialite">politique de confidentialité</Link>).</p>

      <h2>6. Utilisation acceptable</h2>
      <p>Tu t&apos;engages à ne pas utiliser Dropz de façon illégale, à ne pas tenter de perturber son fonctionnement ni de contourner ses protections, et à ne pas en copier le contenu de façon automatisée.</p>

      <h2>7. Limite de responsabilité</h2>
      <p>Dropz est fourni « tel quel », sans garantie. Dans la mesure permise par la loi, Dropz n&apos;est pas responsable des pertes liées à un achat, à une erreur de prix ou de stock, à un article épuisé ou à un site de magasin indisponible. Cette clause ne limite pas les droits qui ne peuvent pas être écartés par la loi.</p>

      <h2>8. Lois applicables</h2>
      <p>Ces conditions sont régies par les lois en vigueur au Québec et les lois fédérales du Canada qui s&apos;y appliquent.</p>

      <h2>9. Changements et contact</h2>
      <p>Nous pouvons modifier ces conditions ; la date de mise à jour en haut de la page sera alors changée. Pour toute question : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalLayout>
  );
}