import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { AdminRoute } from './components/AdminRoute';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RecordingIndicator } from './components/videos/RecordingIndicator';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { ConnectMachinePage } from './pages/ConnectMachinePage';
import { DesktopConnectPage } from './pages/DesktopConnectPage';
import { DevicesPage } from './pages/DevicesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { MetricsPage } from './pages/MetricsPage';
import { CloudPage } from './pages/CloudPage';
import { LogsPage } from './pages/LogsPage';
import { AllTasksBoardPage } from './pages/AllTasksBoardPage';
import { ChatbotSettingsPage } from './pages/ChatbotSettingsPage';
import { ChatbotTestingPage } from './pages/ChatbotTestingPage';
import { DiagramsHubPage } from './pages/DiagramsHubPage';
import { DownloadPage } from './pages/DownloadPage';
import { ExtensionLabPage } from './pages/ExtensionLabPage';
import { LoginPage } from './pages/LoginPage';
import { McpToolsSettingsPage } from './pages/McpToolsSettingsPage';
import { StorageSettingsPage } from './pages/StorageSettingsPage';
import { OrganizationActivityPage } from './pages/OrganizationActivityPage';
import { OrganizationProjectsPage } from './pages/OrganizationProjectsPage';
import { OrganizationsPage } from './pages/OrganizationsPage';
import { ProjectDiagramEditorPage } from './pages/ProjectDiagramEditorPage';
import { ProjectDiagramsPage } from './pages/ProjectDiagramsPage';
import { ProjectWireframePreviewPage } from './pages/ProjectWireframePreviewPage';
import { ProjectWireframesPage } from './pages/ProjectWireframesPage';
import { ProjectVideoEditorPage } from './pages/ProjectVideoEditorPage';
import { ProjectVideosPage } from './pages/ProjectVideosPage';
import { VideosHubPage } from './pages/VideosHubPage';
import { WireframesHubPage } from './pages/WireframesHubPage';
import { NamesHubPage } from './pages/NamesHubPage';
import { NameSessionPage } from './pages/NameSessionPage';
import { SeoHubPage } from './pages/SeoHubPage';
import { ProjectSeoPage } from './pages/ProjectSeoPage';
import { SeoSitePage } from './pages/SeoSitePage';
import { SeoSettingsPage } from './pages/SeoSettingsPage';
import { ProjectQaInfoPage } from './pages/ProjectQaInfoPage';
import { ProjectTasksPage } from './pages/ProjectTasksPage';

function LegacyNameSessionRedirect() {
  const { sessionId } = useParams();
  return <Navigate to={sessionId ? `/names/${sessionId}` : '/names'} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <>
                  <ProtectedRoute />
                  <RecordingIndicator />
                </>
              }
            >
              <Route path="/desktop/connect" element={<DesktopConnectPage />} />
              <Route path="/connect-machine" element={<ConnectMachinePage />} />
              <Route
                path="/organizations/:orgId/projects/:projectId/diagrams/:diagramId"
                element={
                  <WorkspaceProvider>
                    <ProjectDiagramEditorPage />
                  </WorkspaceProvider>
                }
              />
              <Route
                path="/organizations/:orgId/projects/:projectId/wireframes/:wireframeId"
                element={
                  <WorkspaceProvider>
                    <ProjectWireframePreviewPage />
                  </WorkspaceProvider>
                }
              />
              <Route
                path="/organizations/:orgId/projects/:projectId/videos/:videoId"
                element={
                  <WorkspaceProvider>
                    <ProjectVideoEditorPage />
                  </WorkspaceProvider>
                }
              />
              <Route
                element={
                  <WorkspaceProvider>
                    <Layout tightPage />
                  </WorkspaceProvider>
                }
              >
                <Route path="/diagrams" element={<DiagramsHubPage />} />
                <Route
                  path="/organizations/:orgId/projects/:projectId/wireframes"
                  element={<ProjectWireframesPage />}
                />
              </Route>
              <Route
                element={
                  <WorkspaceProvider>
                    <Layout />
                  </WorkspaceProvider>
                }
              >
                <Route path="/chat" element={<Navigate to="/board" replace />} />
                <Route path="/board" element={<AllTasksBoardPage />} />
                <Route path="/wireframes" element={<WireframesHubPage />} />
                <Route path="/videos" element={<VideosHubPage />} />
                <Route path="/names" element={<NamesHubPage />} />
                <Route path="/names/:sessionId" element={<NameSessionPage />} />
                <Route path="/seo" element={<SeoHubPage />} />
                <Route path="/organizations" element={<OrganizationsPage />} />
                <Route path="/devices" element={<DevicesPage />} />
                <Route
                  path="/browsers"
                  element={<Navigate to="/devices" replace />}
                />
                <Route
                  path="/connected-machines"
                  element={<Navigate to="/devices" replace />}
                />
                <Route path="/download" element={<DownloadPage />} />
                <Route
                  path="/download/extension-lab"
                  element={<ExtensionLabPage />}
                />
                <Route element={<AdminRoute />}>
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/metrics" element={<MetricsPage />} />
                  <Route path="/cloud" element={<CloudPage />} />
                  <Route path="/logs" element={<LogsPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route
                    path="/admin/devices"
                    element={<Navigate to="/devices" replace />}
                  />
                  <Route
                    path="/settings/chatbot"
                    element={<ChatbotSettingsPage />}
                  />
                  <Route
                    path="/settings/chatbot/testing"
                    element={<ChatbotTestingPage />}
                  />
                  <Route
                    path="/settings/mcp-tools"
                    element={<McpToolsSettingsPage />}
                  />
                  <Route
                    path="/settings/storage"
                    element={<StorageSettingsPage />}
                  />
                  <Route
                    path="/settings/seo"
                    element={<SeoSettingsPage />}
                  />
                </Route>
                <Route
                  path="/organizations/:orgId"
                  element={<OrganizationProjectsPage />}
                />
                <Route
                  path="/organizations/:orgId/activity"
                  element={<OrganizationActivityPage />}
                />
                <Route
                  path="/organizations/:orgId/projects/:projectId"
                  element={<ProjectTasksPage />}
                />
                <Route
                  path="/organizations/:orgId/projects/:projectId/qa-info"
                  element={<ProjectQaInfoPage />}
                />
                <Route
                  path="/organizations/:orgId/projects/:projectId/diagrams"
                  element={<ProjectDiagramsPage />}
                />
                <Route
                  path="/organizations/:orgId/projects/:projectId/videos"
                  element={<ProjectVideosPage />}
                />
                <Route
                  path="/organizations/:orgId/projects/:projectId/names"
                  element={<Navigate to="/names" replace />}
                />
                <Route
                  path="/organizations/:orgId/projects/:projectId/names/:sessionId"
                  element={<LegacyNameSessionRedirect />}
                />
                <Route
                  path="/organizations/:orgId/projects/:projectId/seo"
                  element={<ProjectSeoPage />}
                />
                <Route
                  path="/organizations/:orgId/projects/:projectId/seo/:siteId"
                  element={<SeoSitePage />}
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
