import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { NotificationCenterPage } from "./pages/NotificationCenterPage";
import { ProjectDetailPage } from "./pages/ProjectDetailPage";
import { ProjectListPage } from "./pages/ProjectListPage";

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ProjectListPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/notifications" element={<NotificationCenterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
