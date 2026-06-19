import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { OrganizationProjectsPage } from './pages/OrganizationProjectsPage';
import { OrganizationsPage } from './pages/OrganizationsPage';
import { ProjectTasksPage } from './pages/ProjectTasksPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route
              element={
                <WorkspaceProvider>
                  <Layout />
                </WorkspaceProvider>
              }
            >
              <Route path="/organizations" element={<OrganizationsPage />} />
              <Route
                path="/organizations/:orgId"
                element={<OrganizationProjectsPage />}
              />
              <Route
                path="/organizations/:orgId/projects/:projectId"
                element={<ProjectTasksPage />}
              />
              <Route path="/" element={<Navigate to="/organizations" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/organizations" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
