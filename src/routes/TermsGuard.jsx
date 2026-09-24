import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

const CURRENT_TERMS_VERSION = "1.0";

function TermsGuard() {
  const { user, isLoading: authLoading } = useAuth();
  const location = useLocation();

  const [isChecking, setIsChecking] = useState(true);
  const [hasAccepted, setHasAccepted] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkTerms() {
      if (!user) {
        if (mounted) {
          setIsChecking(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("terms_accepted, terms_version")
        .eq("id", user.id)
        .single();

      if (!mounted) return;

      if (error) {
        console.error("Error checking Terms acceptance:", error);
        setHasAccepted(false);
      } else {
        setHasAccepted(
          data?.terms_accepted === true &&
            data?.terms_version === CURRENT_TERMS_VERSION
        );
      }

      setIsChecking(false);
    }

    checkTerms();

    return () => {
      mounted = false;
    };
  }, [user]);

  // Wait for the authentication state to finish loading.
  if (authLoading || isChecking) {
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--bg)] px-5 text-center text-sm text-[var(--text-secondary)]">
        Preparing your Meridian workspace…
      </main>
    );
  }

  // User isn't authenticated or hasn't verified their email.
  if (!user?.email_confirmed_at) {
    return (
      <Navigate
        to="/sign-in"
        replace
        state={{
          from: location,
          message:
            "Verify your email address before accessing Meridian.",
        }}
      />
    );
  }

  // User hasn't accepted the current Terms version.
  if (!hasAccepted) {
    return (
      <Navigate
        to="/terms"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  // Terms accepted — allow access to the protected app routes.
  return <Outlet />;
}

export default TermsGuard;