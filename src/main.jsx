import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AccountProvider } from "./context/AccountProvider";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ProfileProvider } from "./context/ProfileProvider";
import { SubscriptionProvider } from "./context/SubscriptionProvider";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <SubscriptionProvider>
        <AccountProvider>
          <ProfileProvider>
            <App />
          </ProfileProvider>
        </AccountProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </StrictMode>
);
