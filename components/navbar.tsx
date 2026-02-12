"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/rankings", label: "Rankings" },
  { href: "/creator/dashboard", label: "Dashboard" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const renderLinks = (mobile = false) => (
    <>
      {navLinks.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`type-small rounded-xl px-3 py-2 transition-colors ${
              active
                ? "bg-sakura text-primary-foreground"
                : "text-rice/85 hover:bg-charcoal hover:text-rice"
            } ${mobile ? "w-full" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <header className="ink-panel sticky top-4 z-50 rounded-2xl px-4 py-3 sm:px-6">
      <nav className="flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3">
          <div className="from-sakura to-crimson flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-h4 font-semibold text-white">
            S
          </div>
          <div>
            <p className="font-brand text-h4 text-sakura">Seizuki</p>
            <p className="type-micro uppercase tracking-[0.2em] text-muted-foreground">Live manga fandom</p>
          </div>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {renderLinks()}
          <Link
            href="/create/series"
            className="type-small ml-1 rounded-xl border border-sakura/60 px-4 py-2 text-sakura transition-colors hover:bg-sakura/10"
          >
            Become a Creator
          </Link>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={logout}
              className="type-small rounded-xl bg-charcoal px-3 py-2 text-rice transition-colors hover:bg-border-subtle"
            >
              {user?.username} (Log out)
            </button>
          ) : (
            <Link
              href="/login"
              className="type-small rounded-xl bg-sakura px-4 py-2 font-semibold text-primary-foreground transition-colors hover:bg-sakura/90"
            >
              Sign in
            </Link>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle bg-charcoal text-rice md:hidden"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span className="sr-only">Toggle menu</span>
          <span className="relative h-4 w-5">
            <span
              className={`absolute left-0 h-0.5 w-5 rounded-full bg-rice transition-all ${
                open ? "top-1.5 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 top-1.5 h-0.5 w-5 rounded-full bg-rice transition-opacity ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 h-0.5 w-5 rounded-full bg-rice transition-all ${
                open ? "top-1.5 -rotate-45" : "top-3"
              }`}
            />
          </span>
        </button>
      </nav>

      {open && (
        <div className="mt-4 flex flex-col gap-2 border-t border-border-subtle pt-4 md:hidden">
          {renderLinks(true)}
          <Link
            href="/create/series"
            onClick={() => setOpen(false)}
            className="type-small rounded-xl border border-sakura/60 px-4 py-2 text-sakura"
          >
            Become a Creator
          </Link>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="type-small rounded-xl bg-charcoal px-4 py-2 text-rice"
            >
              Log out ({user?.username})
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="type-small rounded-xl bg-sakura px-4 py-2 font-semibold text-primary-foreground"
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
