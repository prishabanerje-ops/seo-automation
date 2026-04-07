import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// 401 interceptor — redirect to login when session expires
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const current = window.location.pathname;
      if (current !== "/login" && current !== "/setup" && !current.startsWith("/invite")) {
        window.location.replace(`/login?from=${encodeURIComponent(current)}`);
      }
    }
    return Promise.reject(err);
  }
);

export const getSites = () => api.get("/sites");
export const getHealth = () => axios.get("/health");

export const getReport = (siteId, section) => api.get(`/reports/${siteId}/${section}`);
export const getSummary = (siteId) => api.get(`/reports/${siteId}/summary`);
export const getHistory = () => api.get("/crawl/history");
export const getSiteHistory = (siteId) => api.get(`/crawl/history/${siteId}`);
export const compareCrawls = (siteId, jobA, jobB) =>
  api.get(`/reports/compare-crawls/${siteId}`, { params: { jobA, jobB } });
export const runPageSpeed = (siteId, urls) => api.post("/pagespeed/run", { siteId, urls });
export const getJobAudit = (jobId, params = {}) => api.get(`/reports/job/${jobId}`, { params });
export const getTopIssues = (limit = 10) => api.get(`/reports/top-issues`, { params: { limit } });
export const deleteCrawlJob = (jobId) => api.delete(`/crawl/${jobId}`);

export const getGscStatus = () => api.get("/gsc/status");
export const getGscSummaryAll = () => api.get("/gsc/summary/all");
export const getGscSummary = (siteId) => api.get(`/gsc/summary/${siteId}`);
export const getGscQueries = (siteId, limit = 100) => api.get(`/gsc/queries/${siteId}`, { params: { limit } });
export const getGscTrend = (siteId) => api.get(`/gsc/trend/${siteId}`);
export const getGscPages = (siteId) => api.get(`/gsc/data/${siteId}`);
export const fetchGscData = (siteId) => api.post(`/gsc/fetch/${siteId}`);

export const getTasks = (siteId) => api.get("/tasks", siteId ? { params: { siteId } } : {});
export const updateTask = (id, data) => api.patch(`/tasks/${id}`, data);
export const createTask = (data) => api.post("/tasks", data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);

export default api;
