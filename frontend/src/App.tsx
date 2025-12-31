import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { History } from './pages/History';
import { OutlineEditor } from './pages/OutlineEditor';
import { DetailEditor } from './pages/DetailEditor';
import { SlidePreview } from './pages/SlidePreview';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { UserManagement } from './pages/UserManagement';
import { AdminProjects } from './pages/AdminProjects';
import { AuditLogs } from './pages/AuditLogs';
import { Membership } from './pages/Membership';
import { MembershipPlans } from './pages/MembershipPlans';
import { Orders } from './pages/Orders';
import { AdminOrders } from './pages/AdminOrders';
import PdfToPptx from './pages/PdfToPptx';
import { useProjectStore } from './store/useProjectStore';
import { useAuthStore } from './store/useAuthStore';
import { useToast, GithubLink, ProtectedRoute, PublicRoute, ForcePasswordChangeModal } from './components/shared';

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
    <BrowserRouter>
      <Routes>
        {/* 公开路由 */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* 受保护路由 */}
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/membership" element={<ProtectedRoute><Membership /></ProtectedRoute>} />
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
      <ToastContainer />
      <GithubLink />
      <ForcePasswordChangeModal />
    </BrowserRouter>
  );
}

export default App;

