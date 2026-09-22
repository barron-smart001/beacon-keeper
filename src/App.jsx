import { BrowserRouter, Route, Routes } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import TradesPage from "./pages/TradesPage";
import MoneyPage from "./pages/Finance/MoneyPage";
import RulesPage from "./pages/RulesPage";
import GoalsPage from "./pages/GoalsPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import ProtectedRoute from "./routes/ProtectedRoute";

const App = () => (
  <BrowserRouter>
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
      <Route path="/sign-up" element={<AuthPage mode="sign-up" />} />
      <Route path="/forgot-password" element={<AuthPage mode="forgot-password" />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected application */}
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<OnboardingPage />} />

        <Route path="/app" element={<DashboardPage />} />
        <Route path="/app/trades" element={<TradesPage />} />
        <Route path="/app/money" element={<MoneyPage />} />
        <Route path="/app/rules" element={<RulesPage />} />
        <Route path="/app/goals" element={<GoalsPage />} />
        <Route path="/app/calendar" element={<CalendarPage />} />
        <Route path="/app/settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  </BrowserRouter>
);

export default App;
