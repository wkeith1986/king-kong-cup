"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Player } from "@/lib/types";
import { slugifyName } from "@/lib/slug";

/**
 * Inline player filter for the cards page. Pick a name to filter the page
 * to just that player's card; the URL updates with ?player=slug so it can
 * be bookmarked. "Copy my link" exposes the bookmarkable URL.
 */
export function PlayerPicker({
  players,
  roundNumber,
}: {
  players: Player[];
  roundNumber: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const currentSlug = sp?.get("player") ?? "";
  const [copied, setCopied] = useState(false);

  const onChange = (slug: string) => {
    const params = new URLSearchParams(sp?.toString() ?? "");
    if (slug) params.set("player", slug);
    else params.delete("player");
    const qs = params.toString();
    router.replace(`/cards/${roundNumber}${qs ? `?${qs}` : ""}`);
  };

  const onCopy = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Older browsers — fall back to a prompt-style noop; user can copy the URL bar.
      alert(`Copy this URL:\n\n${url}`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs uppercase tracking-widest text-brand-cream/60">
        Show
      </label>
      <select
        className="input py-1.5"
        value={currentSlug}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All players</option>
        {players.map((p) => (
          <option key={p.id} value={slugifyName(p.name)}>
            {p.name}
          </option>
        ))}
      </select>
      {currentSlug && (
        <button
          type="button"
          onClick={onCopy}
          className="text-xs px-2.5 py-1.5 rounded-md border border-brand-gold/30 text-brand-cream/85 hover:bg-brand-gold/10"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      )}
    </div>
  );
}
