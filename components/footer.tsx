import Link from "next/link";

const footerLinks = [
  { label: "Home", href: "/" },
  { label: "Explore", href: "/explore" },
  { label: "Rankings", href: "/rankings" },
  { label: "Creator Dashboard", href: "/creator/dashboard" },
  { label: "Login", href: "/login" },
];

export function Footer() {
  return (
    <footer className="ink-panel rounded-2xl px-5 py-6 sm:px-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-brand text-h4 text-sakura">Seizuki</p>
          <p className="type-small mt-2 max-w-md text-muted-foreground">
            Community-first, self-published manga and comics with always-on live overlays.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {footerLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="type-small rounded-xl px-3 py-2 text-rice/85 transition-colors hover:bg-charcoal hover:text-rice"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-border-subtle pt-4">
        <p className="type-micro text-muted-foreground">
          Copyright {new Date().getFullYear()} Seizuki. Online reading only. No download endpoints.
        </p>
      </div>
    </footer>
  );
}
