import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AppLayout } from './components/layout';
import { HomePage, EventDetailPage, NotFoundPage } from './pages';
import { ProtectedRoute } from './router';

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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route element={<ProtectedRoute />}>
              {/* Protected routes go here */}
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
  );
}
