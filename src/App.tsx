import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AllTasksBoardPage } from './pages/AllTasksBoardPage';
import { GeneralKnowledgePage } from './pages/GeneralKnowledgePage';
import { GeneralPersonKnowledgePage } from './pages/GeneralPersonKnowledgePage';
import { GeneralPersonsPage } from './pages/GeneralPersonsPage';
import { LoginPage } from './pages/LoginPage';
import { OrganizationKnowledgePage } from './pages/OrganizationKnowledgePage';
import { OrganizationPersonsPage } from './pages/OrganizationPersonsPage';
import { OrganizationProjectsPage } from './pages/OrganizationProjectsPage';
import { OrganizationsPage } from './pages/OrganizationsPage';
import { PersonKnowledgePage } from './pages/PersonKnowledgePage';
import { ProjectKnowledgePage } from './pages/ProjectKnowledgePage';
import { ProjectTasksPage } from './pages/ProjectTasksPage';

export default function App() {
  return (
    <ThemeProvider>
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
                <Route path="/board" element={<AllTasksBoardPage />} />
                <Route path="/knowledge" element={<GeneralKnowledgePage />} />
                <Route path="/people" element={<GeneralPersonsPage />} />
                <Route
                  path="/people/:personId/knowledge"
                  element={<GeneralPersonKnowledgePage />}
                />
                <Route path="/organizations" element={<OrganizationsPage />} />
                <Route
                  path="/organizations/:orgId"
                  element={<OrganizationProjectsPage />}
                />
                <Route
                  path="/organizations/:orgId/knowledge"
                  element={<OrganizationKnowledgePage />}
                />
                <Route
                  path="/organizations/:orgId/persons"
                  element={<OrganizationPersonsPage />}
                />
                <Route
                  path="/organizations/:orgId/persons/:personId/knowledge"
                  element={<PersonKnowledgePage />}
                />
                <Route
                  path="/organizations/:orgId/projects/:projectId"
                  element={<ProjectTasksPage />}
                />
                <Route
                  path="/organizations/:orgId/projects/:projectId/knowledge"
                  element={<ProjectKnowledgePage />}
                />
                <Route path="/" element={<Navigate to="/board" replace />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/board" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
