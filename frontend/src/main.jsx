import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router.jsx";
import { SitesProvider } from "./context/SitesContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { IntentionalRulesProvider } from "./context/IntentionalRulesContext.jsx";
import api from "./api/index.js";
import "./index.css";

// Redirect to /login on any 401 from the backend
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Avoid redirect loops on the login/setup pages
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/setup" && !path.startsWith("/invite")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <SitesProvider>
        <IntentionalRulesProvider>
          <RouterProvider router={router} />
        </IntentionalRulesProvider>
      </SitesProvider>
    </AuthProvider>
  </React.StrictMode>
);
