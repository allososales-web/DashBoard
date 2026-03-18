import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import StoreLayout from './components/StoreLayout';
import HqLayout from './components/HqLayout';
import DashboardPage from './pages/store/DashboardPage';
import QuotesPage from './pages/store/QuotesPage';
import ContractsPage from './pages/store/ContractsPage';
import ConsultsPage from './pages/store/ConsultsPage';
import MemosPage from './pages/store/MemosPage';
import IssuesPage from './pages/store/IssuesPage';
import StaffsPage from './pages/store/StaffsPage';
import SchedulesPage from './pages/store/SchedulesPage';
import DeliveriesPage from './pages/store/DeliveriesPage';
import WorkRecordsPage from './pages/store/WorkRecordsPage';
import HqDashboardPage from './pages/hq/HqDashboardPage';

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
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/hq" element={<HqGuard><HqLayout /></HqGuard>}>
              <Route index element={<HqDashboardPage />} />
            </Route>
            <Route path="/store/:storeId" element={<AuthGuard><StoreLayout /></AuthGuard>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="quotes" element={<QuotesPage />} />
              <Route path="contracts" element={<ContractsPage />} />
              <Route path="consults" element={<ConsultsPage />} />
              <Route path="memos" element={<MemosPage />} />
              <Route path="issues" element={<IssuesPage />} />
              <Route path="staffs" element={<StaffsPage />} />
              <Route path="schedules" element={<SchedulesPage />} />
              <Route path="deliveries" element={<DeliveriesPage />} />
              <Route path="work-records" element={<WorkRecordsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
