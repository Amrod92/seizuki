"use client";

import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/components/auth-provider";
import { OAuthProvider } from "@/lib/types";

const providers: Array<{ provider: OAuthProvider; label: string; sub: string }> = [
  { provider: "google", label: "Continue with Google", sub: "Reader profile" },
  { provider: "discord", label: "Continue with Discord", sub: "Creator profile" },
  { provider: "apple", label: "Continue with Apple", sub: "Creator profile" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const redirectTarget =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("redirect") ?? "/"
      : "/";

  const handleLogin = (provider: OAuthProvider) => {
    login(provider);
    router.push(redirectTarget);
  };

  return (
    <SiteShell>
      <section className="mx-auto w-full max-w-xl space-y-4">
        <div className="ink-panel rounded-2xl p-6">
          <h1 className="type-h1 text-rice">Login</h1>
          <p className="type-small mt-2 text-muted-foreground">
            OAuth only in MVP. Sign in to comment, react, vote, follow, and report.
          </p>

          <div className="mt-5 space-y-3">
            {providers.map((item) => (
              <button
                key={item.provider}
                type="button"
                onClick={() => handleLogin(item.provider)}
                className="w-full rounded-xl border border-border-subtle bg-charcoal p-4 text-left transition-colors hover:border-sakura/70"
              >
                <p className="type-body text-rice">{item.label}</p>
                <p className="type-small text-muted-foreground">{item.sub}</p>
              </button>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
