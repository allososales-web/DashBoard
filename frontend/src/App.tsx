import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import StoreLayout from './components/StoreLayout';
import LoginPage from './pages/LoginPage';
import StoreSelectionPage from './pages/StoreSelectionPage';
import DashboardPage from './pages/store/DashboardPage';
import QuotesPage from './pages/store/QuotesPage';
import ContractsPage from './pages/store/ContractsPage';
import ConsultsPage from './pages/store/ConsultsPage';
import MemosPage from './pages/store/MemosPage';
import IssuesPage from './pages/store/IssuesPage';
import StaffsPage from './pages/store/StaffsPage';
import SchedulesPage from './pages/store/SchedulesPage';
import DeliveriesPage from './pages/store/DeliveriesPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/stores" element={<ProtectedRoute><StoreSelectionPage /></ProtectedRoute>} />
            <Route path="/store/:storeId" element={<ProtectedRoute><StoreLayout /></ProtectedRoute>}>
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
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
