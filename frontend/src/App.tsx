import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import StoreLayout from './components/StoreLayout';
import HqLayout from './components/HqLayout';
import DashboardPage from './pages/store/DashboardPage';
import StoreAnalysisPage from './pages/store/StoreAnalysisPage';
import StoreIssuePage from './pages/store/StoreIssuePage';
import StoreDashboardDeliveryWorkTab from './pages/store/StoreDashboardDeliveryWorkTab';
import StoreMetricsInputPage from './pages/store/StoreMetricsInputPage';
import HqPerformanceTab from './pages/hq/tabs/HqPerformanceTab';
import HqStoreStatusTab from './pages/hq/tabs/HqStoreStatusTab';
import HqWorkRecordsTab from './pages/hq/tabs/HqWorkRecordsTab';
import HqGoalEventTab from './pages/hq/tabs/HqGoalEventTab';
import HqAdminTab from './pages/hq/tabs/HqAdminTab';
import BackgroundCanvas from './components/BackgroundCanvas';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function HqGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (role !== 'HQ_ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BackgroundCanvas />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/hq" element={<HqGuard><HqLayout /></HqGuard>}>
              <Route index element={<Navigate to="performance" replace />} />
              <Route path="performance" element={<HqPerformanceTab />} />
              <Route path="store-status" element={<HqStoreStatusTab />} />
              <Route path="work" element={<HqWorkRecordsTab />} />
              <Route path="goal-event" element={<HqGoalEventTab />} />
              <Route path="admin" element={<HqAdminTab />} />
            </Route>
            <Route path="/store/:storeId" element={<AuthGuard><StoreLayout /></AuthGuard>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="analysis" element={<StoreAnalysisPage />} />
              <Route path="store-issue" element={<StoreIssuePage />} />
              <Route path="delivery-work" element={<StoreDashboardDeliveryWorkTab />} />
              <Route path="metrics-input" element={<StoreMetricsInputPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
