import { BrowserRouter, Route, Routes } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import TradesPage from "./pages/TradesPage";
import ProtectedRoute from "./routes/ProtectedRoute";

const App = () => (
  <BrowserRouter>
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
      <Route path="/sign-up" element={<AuthPage mode="sign-up" />} />

      {/* Protected application */}
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<OnboardingPage />} />

        <Route path="/app" element={<DashboardPage />} />
        <Route path="/app/trades" element={<TradesPage />} />

        {/* Feature routes - pages will be built next */}
        <Route path="/app/money" element={<DashboardPage />} />
        <Route path="/app/goals" element={<DashboardPage />} />
        <Route path="/app/calendar" element={<DashboardPage />} />
        <Route path="/app/settings" element={<DashboardPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  </BrowserRouter>
);

export default App;