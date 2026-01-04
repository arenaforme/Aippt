import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useProjectStore } from './store/useProjectStore';
import { useAuthStore } from './store/useAuthStore';
import { useToast, GithubLink, ProtectedRoute, PublicRoute, ForcePasswordChangeModal } from './components/shared';
import { ThemeProvider } from './components/ThemeProvider';
import { Loading } from './components/shared/Loading';

// 路由懒加载 - 提升首屏性能
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const History = lazy(() => import('./pages/History').then(m => ({ default: m.History })));
const OutlineEditor = lazy(() => import('./pages/OutlineEditor').then(m => ({ default: m.OutlineEditor })));
const DetailEditor = lazy(() => import('./pages/DetailEditor').then(m => ({ default: m.DetailEditor })));
const SlidePreview = lazy(() => import('./pages/SlidePreview').then(m => ({ default: m.SlidePreview })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const UserManagement = lazy(() => import('./pages/UserManagement').then(m => ({ default: m.UserManagement })));
const AdminProjects = lazy(() => import('./pages/AdminProjects').then(m => ({ default: m.AdminProjects })));
const AuditLogs = lazy(() => import('./pages/AuditLogs').then(m => ({ default: m.AuditLogs })));
const Membership = lazy(() => import('./pages/Membership').then(m => ({ default: m.Membership })));
const MembershipPlans = lazy(() => import('./pages/MembershipPlans').then(m => ({ default: m.MembershipPlans })));
const Orders = lazy(() => import('./pages/Orders').then(m => ({ default: m.Orders })));
const AdminOrders = lazy(() => import('./pages/AdminOrders').then(m => ({ default: m.AdminOrders })));
const PdfToPptx = lazy(() => import('./pages/PdfToPptx'));
const Templates = lazy(() => import('./pages/Templates').then(m => ({ default: m.Templates })));
const Materials = lazy(() => import('./pages/Materials').then(m => ({ default: m.Materials })));

function App() {
  const { currentProject, syncProject, error, setError } = useProjectStore();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { show, ToastContainer } = useToast();

  // 检查认证状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 恢复项目状态（仅在已登录时）
  useEffect(() => {
    if (isAuthenticated) {
      const savedProjectId = localStorage.getItem('currentProjectId');
      if (savedProjectId && !currentProject) {
        syncProject();
      }
    }
  }, [isAuthenticated, currentProject, syncProject]);

  // 显示全局错误
  useEffect(() => {
    if (error) {
      show({ message: error, type: 'error' });
      setError(null);
    }
  }, [error, setError, show]);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading fullscreen message="加载中..." />}>
          <Routes>
          {/* 公开路由 */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* 受保护路由 */}
          <Route path="/app" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/membership" element={<ProtectedRoute><Membership /></ProtectedRoute>} />
          <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
          <Route path="/materials" element={<ProtectedRoute><Materials /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/project/:projectId/outline" element={<ProtectedRoute><OutlineEditor /></ProtectedRoute>} />
          <Route path="/project/:projectId/detail" element={<ProtectedRoute><DetailEditor /></ProtectedRoute>} />
          <Route path="/project/:projectId/preview" element={<ProtectedRoute><SlidePreview /></ProtectedRoute>} />

          {/* 管理员路由 */}
          <Route path="/admin/users" element={<ProtectedRoute requireAdmin><UserManagement /></ProtectedRoute>} />
          <Route path="/admin/projects" element={<ProtectedRoute requireAdmin><AdminProjects /></ProtectedRoute>} />
          <Route path="/admin/audit-logs" element={<ProtectedRoute requireAdmin><AuditLogs /></ProtectedRoute>} />
          <Route path="/admin/membership/plans" element={<ProtectedRoute requireAdmin><MembershipPlans /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute requireAdmin><AdminOrders /></ProtectedRoute>} />

          {/* 工具路由 */}
          <Route path="/tools/pdf-to-pptx" element={<ProtectedRoute><PdfToPptx /></ProtectedRoute>} />

          {/* 默认重定向 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        <ToastContainer />
        <GithubLink />
        <ForcePasswordChangeModal />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

