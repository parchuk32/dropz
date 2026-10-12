// Petites étiquettes de confiance, calculées avec l'historique des prix que Dropz a lui-même observé.
type Props = { low?: boolean; drop?: number; tracked?: number; dark?: boolean };

export default function PriceBadges({ low, drop, tracked, dark }: Props) {
  const chips: { text: string; tone: "good" | "info" }[] = [];
  if (drop && drop > 0) chips.push({ text: `↓ Baisse de ${drop.toFixed(2).replace(".", ",")} $`, tone: "good" });
  if (low) chips.push({ text: "Plus bas prix suivi", tone: "good" });
  if (tracked && tracked >= 30) chips.push({ text: `En solde depuis ${tracked}+ jours`, tone: "info" });
  if (!chips.length) return null;

  const cls = (tone: "good" | "info") =>
    tone === "good"
      ? dark ? "bg-emerald-400/20 text-emerald-200 ring-emerald-300/40" : "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : dark ? "bg-white/10 text-white/70 ring-white/25" : "bg-neutral-100 text-neutral-600 ring-neutral-200";

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {chips.slice(0, 2).map((c) => (
        <span key={c.text} className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ${cls(c.tone)}`}>{c.text}</span>
      ))}
    </div>
  );
}