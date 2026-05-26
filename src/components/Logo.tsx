"use client";

import { useState } from "react";

/**
 * The King Kong Cup logo.
 *
 * Drop a file at `public/logo.png` (or .jpg) and it will render automatically.
 * Until then, a typographic "KKC" monogram is shown as a fallback.
 */
export function Logo({
  size = "md",
  withWordmark = true,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  withWordmark?: boolean;
}) {
  const px =
    size === "sm" ? 40 : size === "md" ? 52 : size === "lg" ? 96 : 160;
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative shrink-0 overflow-hidden rounded-full border-2 border-brand-gold/60 bg-brand-dark shadow-gold"
        style={{ width: px, height: px }}
      >
        {/* User-supplied logo. Hidden until loaded successfully. */}
        {!errored && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/logo.png"
            alt="King Kong Cup logo"
            width={px}
            height={px}
            className={
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-300 " +
              (loaded ? "opacity-100" : "opacity-0")
            }
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
          />
        )}
        {/* KKC monogram fallback — visible until the image successfully loads. */}
        <div
          className={
            "absolute inset-0 flex items-center justify-center font-display font-bold text-brand-gold pointer-events-none select-none transition-opacity duration-300 " +
            (loaded && !errored ? "opacity-0" : "opacity-100")
          }
          style={{ fontSize: px * 0.34, letterSpacing: "0.02em" }}
          aria-hidden="true"
        >
          KKC
        </div>
      </div>
      {withWordmark && (
        <div className="leading-tight">
          <div className="h-display text-brand-gold text-[10px] sm:text-xs">
            The King Kong
          </div>
          <div className="h-display text-brand-cream text-lg sm:text-xl font-bold">
            Cup
          </div>
        </div>
      )}
    </div>
  );
}
