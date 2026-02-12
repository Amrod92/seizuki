"use client";

import { FormEvent, useState } from "react";
import { AuthPageGuard } from "@/components/auth-page-guard";
import { SiteShell } from "@/components/site-shell";
import { useAuth } from "@/components/auth-provider";
import { updateProfile } from "@/lib/api";

export default function SettingsProfilePage() {
  const { user } = useAuth();

  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = updateProfile(user?._id, { username, bio, avatarUrl });

    if (!result.ok) {
      setError(result.error ?? "Profile update failed.");
      setMessage(null);
      return;
    }

    setError(null);
    setMessage("Profile updated.");
  };

  return (
    <SiteShell>
      <AuthPageGuard>
        <section className="mx-auto w-full max-w-xl space-y-4">
          <h1 className="type-h1 text-rice">Profile Settings</h1>

          <form onSubmit={onSubmit} className="ink-panel space-y-3 rounded-2xl p-5">
            <label className="block">
              <span className="type-small text-muted-foreground">Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="type-body mt-1 w-full rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice"
              />
            </label>

            <label className="block">
              <span className="type-small text-muted-foreground">Bio</span>
              <textarea
                rows={4}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                className="type-body mt-1 w-full rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice"
              />
            </label>

            <label className="block">
              <span className="type-small text-muted-foreground">Avatar URL</span>
              <input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                className="type-body mt-1 w-full rounded-xl border border-border-subtle bg-charcoal px-3 py-2 text-rice"
              />
            </label>

            <button type="submit" className="type-small rounded-xl bg-sakura px-4 py-2 font-semibold text-white">
              Save Changes
            </button>

            {error ? <p className="type-small text-crimson">{error}</p> : null}
            {message ? <p className="type-small text-sakura">{message}</p> : null}
          </form>
        </section>
      </AuthPageGuard>
    </SiteShell>
  );
}
