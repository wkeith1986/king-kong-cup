import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-brand-gold/20 mt-12">
      <div className="container-narrow py-8 text-center text-sm text-brand-cream/60">
        <div className="h-display text-brand-gold mb-2">The King Kong Cup</div>
        <div>Tae Kong&rsquo;s 50th &middot; St. George, Utah &middot; May 27&ndash;31, 2026</div>
        <div className="mt-3">
          <Link
            href="/admin"
            className="text-xs uppercase tracking-widest text-brand-cream/40 hover:text-brand-gold"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
