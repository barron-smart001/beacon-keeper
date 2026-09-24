import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";

import LandingPage from "../../pages/LandingPage";
import AuthPage from "../../pages/AuthPage";
import OnboardingPage from "../../pages/OnboardingPage";
import DashboardPage from "../../pages/DashboardPage";
import TradesPage from "../../pages/TradesPage";
import MoneyPage from "../../pages/Finance/MoneyPage";
import RulesPage from "../../pages/RulesPage";
import GoalsPage from "../../pages/GoalsPage";
import ResetPasswordPage from "../../pages/ResetPasswordPage";
import CalendarPage from "../../pages/CalendarPage";
import SettingsPage from "../../pages/SettingsPage";
import TermsPage from "../../pages/TermsPage";

import ProtectedRoute from "../../routes/ProtectedRoute";
import TermsGuard from "../../routes/TermsGuard";
import PageTransition from "./PageTransition";

import { Route, Routes } from "react-router-dom";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes */}

        <Route
          path="/"
          element={
            <PageTransition>
              <LandingPage />
            </PageTransition>
          }
        />

        <Route
          path="/sign-in"
          element={
            <PageTransition calm>
              <AuthPage mode="sign-in" />
            </PageTransition>
          }
        />

        <Route
          path="/sign-up"
          element={
            <PageTransition calm>
              <AuthPage mode="sign-up" />
            </PageTransition>
          }
        />

        <Route
          path="/forgot-password"
          element={
            <PageTransition calm>
              <AuthPage mode="forgot-password" />
            </PageTransition>
          }
        />

        <Route
          path="/reset-password"
          element={
            <PageTransition calm>
              <ResetPasswordPage />
            </PageTransition>
          }
        />

        {/* Protected routes */}

        <Route element={<ProtectedRoute />}>
          {/* Onboarding does not require Terms acceptance */}
          <Route
            path="/onboarding"
            element={
              <PageTransition>
                <OnboardingPage />
              </PageTransition>
            }
          />

          {/* Terms & Conditions */}
          <Route
            path="/terms"
            element={
              <PageTransition calm>
                <TermsPage />
              </PageTransition>
            }
          />

          {/* Meridian application requires accepted Terms */}
          <Route element={<TermsGuard />}>
            <Route path="/app" element={<DashboardPage />} />

            <Route path="/app/trades" element={<TradesPage />} />

            <Route path="/app/money" element={<MoneyPage />} />

            <Route path="/app/rules" element={<RulesPage />} />

            <Route path="/app/goals" element={<GoalsPage />} />

            <Route path="/app/calendar" element={<CalendarPage />} />

            <Route path="/app/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Fallback */}

        <Route
          path="*"
          element={
            <PageTransition>
              <LandingPage />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

export default AnimatedRoutes;