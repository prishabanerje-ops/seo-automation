import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import { useSites } from "./context/SitesContext.jsx";

export default function App() {
  const location = useLocation();
  const { activeSiteId, setActiveSiteId } = useSites();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Header notifCount={0} />
        <main className="app-content page-enter" key={location.pathname}>
          <Outlet context={{ activeSiteId, setActiveSiteId }} />
        </main>
      </div>
    </div>
  );
}
