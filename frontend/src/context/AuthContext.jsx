import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/index.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = not authed
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get("/auth/me")
      .then(r => setUser(r.data.user || null))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  function logout() {
    api.post("/auth/logout").catch(() => {});
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
