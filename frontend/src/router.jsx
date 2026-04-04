import { createBrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import SetupPage from "./pages/SetupPage.jsx";
import InviteAccept from "./pages/InviteAccept.jsx";
import ManageUsers from "./pages/ManageUsers.jsx";

// Existing pages
import Dashboard        from "./pages/Dashboard.jsx";
import CrawlRunner      from "./pages/CrawlRunner.jsx";
import AuditView        from "./pages/AuditView.jsx";
import GSCOverlay       from "./pages/GSCOverlay.jsx";
import PageSpeed        from "./pages/PageSpeed.jsx";
import CustomExtraction from "./pages/CustomExtraction.jsx";
import Scheduler        from "./pages/Scheduler.jsx";
import Settings         from "./pages/Settings.jsx";

// New top-level pages
import AuditHealth      from "./pages/AuditHealth.jsx";
import GA4Overlay       from "./pages/GA4Overlay.jsx";
import SystemHealth     from "./pages/SystemHealth.jsx";
import FounderView      from "./pages/FounderView.jsx";
import ManageSites      from "./pages/ManageSites.jsx";

// Audit categories (legacy names kept for backward compat)
import ResponseCodes    from "./pages/ResponseCodes.jsx";
import MetaTags         from "./pages/MetaTags.jsx";
import Headings         from "./pages/Headings.jsx";
import Images           from "./pages/Images.jsx";          // images (old route)
import Canonicals       from "./pages/Canonicals.jsx";       // canonicals (old route)
import StructuredData   from "./pages/StructuredData.jsx";  // schema (old route)
import InternalLinks    from "./pages/InternalLinks.jsx";   // internal-links (old route)

// New category pages
import Redirects            from "./pages/Redirects.jsx";
import Errors404            from "./pages/Errors404.jsx";
import HttpsSecurity        from "./pages/HttpsSecurity.jsx";
import CanonicalTags        from "./pages/CanonicalTags.jsx";
import RobotsTxt            from "./pages/RobotsTxt.jsx";
import MetaRobots           from "./pages/MetaRobots.jsx";
import UrlStructure         from "./pages/UrlStructure.jsx";
import TitleTags            from "./pages/TitleTags.jsx";
import ContentQuality       from "./pages/ContentQuality.jsx";
import KeywordStrategy      from "./pages/KeywordStrategy.jsx";
import Sitemaps             from "./pages/Sitemaps.jsx";
import JavascriptRendering  from "./pages/JavascriptRendering.jsx";
import HtmlStructure        from "./pages/HtmlStructure.jsx";
import MSiteDesktop         from "./pages/MSiteDesktop.jsx";
import ImagesMedia          from "./pages/ImagesMedia.jsx";
import CoreWebVitals        from "./pages/CoreWebVitals.jsx";
import InternalLinking      from "./pages/InternalLinking.jsx";
import LocalSeo             from "./pages/LocalSeo.jsx";
import Backlinks            from "./pages/Backlinks.jsx";
import Hreflang             from "./pages/Hreflang.jsx";
import AnalyticsTracking    from "./pages/AnalyticsTracking.jsx";
import LogFileAnalysis      from "./pages/LogFileAnalysis.jsx";

const wrap = (el) => <ProtectedRoute>{el}</ProtectedRoute>;

export const router = createBrowserRouter([
  // Public auth routes (outside App shell)
  { path: "/login",          element: <Login /> },
  { path: "/setup",          element: <SetupPage /> },
  { path: "/invite/:token",  element: <InviteAccept /> },

  {
    path: "/",
    element: wrap(<App />),
    children: [
      // Core
      { index: true,                    element: <Dashboard /> },
      { path: "founder",                element: <FounderView /> },
      { path: "crawl",                  element: <CrawlRunner /> },
      { path: "audit",                  element: <AuditView /> },
      { path: "audit-health",           element: <AuditHealth /> },

      // Audit categories
      { path: "response-codes",         element: <ResponseCodes /> },
      { path: "redirects",              element: <Redirects /> },
      { path: "404-errors",             element: <Errors404 /> },
      { path: "https-security",         element: <HttpsSecurity /> },
      { path: "canonical-tags",         element: <CanonicalTags /> },
      { path: "robots-txt",             element: <RobotsTxt /> },
      { path: "meta-robots",            element: <MetaRobots /> },
      { path: "url-structure",          element: <UrlStructure /> },
      { path: "title-tags",             element: <TitleTags /> },
      { path: "meta-descriptions",      element: <MetaTags /> },
      { path: "headings",               element: <Headings /> },
      { path: "content-quality",        element: <ContentQuality /> },
      { path: "keyword-strategy",       element: <KeywordStrategy /> },
      { path: "sitemaps",               element: <Sitemaps /> },
      { path: "javascript-rendering",   element: <JavascriptRendering /> },
      { path: "html-structure",         element: <HtmlStructure /> },
      { path: "m-site-desktop",         element: <MSiteDesktop /> },
      { path: "schema",                 element: <StructuredData /> },
      { path: "images-media",           element: <ImagesMedia /> },
      { path: "core-web-vitals",        element: <CoreWebVitals /> },
      { path: "internal-linking",       element: <InternalLinking /> },
      { path: "local-seo",              element: <LocalSeo /> },
      { path: "backlinks",              element: <Backlinks /> },
      { path: "hreflang",               element: <Hreflang /> },
      { path: "analytics-tracking",     element: <AnalyticsTracking /> },
      { path: "log-file-analysis",      element: <LogFileAnalysis /> },

      // Legacy routes
      { path: "meta-tags",              element: <MetaTags /> },
      { path: "images",                 element: <Images /> },
      { path: "canonicals",             element: <Canonicals /> },
      { path: "structured-data",        element: <StructuredData /> },
      { path: "internal-links",         element: <InternalLinks /> },
      { path: "custom-extraction",      element: <CustomExtraction /> },

      // Data sources
      { path: "gsc",                    element: <GSCOverlay /> },
      { path: "ga4",                    element: <GA4Overlay /> },
      { path: "page-speed",             element: <PageSpeed /> },

      // Config
      { path: "scheduler",              element: <Scheduler /> },
      { path: "settings",               element: <Settings /> },
      { path: "settings/status",        element: <SystemHealth /> },
      { path: "settings/users",         element: <ManageUsers /> },
      { path: "sites",                  element: <ManageSites /> },
    ]
  }
]);
