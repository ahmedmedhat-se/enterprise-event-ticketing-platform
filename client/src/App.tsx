import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AppLayout } from './components/layout';
import {
  HomePage,
  EventDetailPage,
  NotFoundPage,
  LoginPage,
  OrganizerLoginPage,
  SignupPage,
  OrganizerSignupPage,
  FanDashboardPage,
  OrganizerDashboardPage,
} from './pages';
import { ProtectedRoute } from './router';
import { ErrorBoundary } from './components/error';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/organizer/login" element={<OrganizerLoginPage />} />
              <Route path="/organizer/signup" element={<OrganizerSignupPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<FanDashboardPage />} />
                <Route path="/organizer/dashboard" element={<OrganizerDashboardPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#14121c',
              color: '#f5f3f8',
              fontSize: '14px',
              borderRadius: '12px',
            },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
