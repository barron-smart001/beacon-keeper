import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import AppShell from "../components/app/AppShell";
import ProfileCard from "../components/profile/ProfileCard";
import { ScrollReveal } from "../components/motion/ScrollReveal";

function ProfilePage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-10">
        <ScrollReveal as="div">
          <Link
            to="/app/settings"
            className="inline-flex min-h-10 items-center gap-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <ArrowLeft size={16} />
            Back to settings
          </Link>

          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Account
          </p>

          <h1 className="mt-3 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">
            Profile
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Manage your personal details and profile photo.
          </p>
        </ScrollReveal>

        <ScrollReveal as="section" className="mt-8">
          <ProfileCard />
        </ScrollReveal>
      </main>
    </AppShell>
  );
}

export default ProfilePage;
