import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <main className="grid min-h-screen place-items-center bg-[var(--bg)] px-5 text-center text-sm text-[var(--text-secondary)]">Restoring your Meridian session…</main>;
  }

  return user?.email_confirmed_at ? <Outlet /> : <Navigate to="/sign-in" replace state={{ from: location, message: "Verify your email address before accessing your dashboard." }} />;
}

export default ProtectedRoute;
