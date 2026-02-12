"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";

export function AuthAction({
  children,
  onAuthed,
  className,
}: {
  children: ReactNode;
  onAuthed: () => void;
  className?: string;
}) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return (
      <button type="button" onClick={onAuthed} className={className}>
        {children}
      </button>
    );
  }

  return (
    <Link href="/login" className={className}>
      {children}
    </Link>
  );
}
