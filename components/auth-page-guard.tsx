"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

export function AuthPageGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return <p className="type-body text-muted-foreground">Loading session...</p>;
  }

  if (!user) {
    return (
      <div className="ink-panel rounded-2xl p-6">
        <p className="type-body text-rice">This page requires login.</p>
        <Link href={`/login?redirect=${encodeURIComponent(pathname)}`} className="type-small mt-3 inline-flex rounded-xl bg-sakura px-4 py-2 text-white">
          Sign in
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
