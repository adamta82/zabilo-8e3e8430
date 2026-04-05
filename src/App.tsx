import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Requests from "./pages/Requests";
import Employees from "./pages/Employees";
import Departments from "./pages/Departments";
import Settings from "./pages/Settings";
import ShiftScheduler from "./pages/ShiftScheduler";
import OrgChart from "./pages/OrgChart";
import MyArea from "./pages/MyArea";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, isLoading } = useAuth();

  // Redirect to dashboard if already logged in
  if (!isLoading && user && window.location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Requests />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/org-chart"
        element={
          <ProtectedRoute>
            <AppLayout>
              <OrgChart />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-area"
        element={
          <ProtectedRoute>
            <AppLayout>
              <MyArea />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/shifts"
        element={
          <ProtectedRoute requireAdmin>
            <AppLayout>
              <ShiftScheduler />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <ProtectedRoute requireAdmin>
            <AppLayout>
              <Employees />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/departments"
        element={
          <ProtectedRoute requireAdmin>
            <AppLayout>
              <Departments />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute requireAdmin>
            <AppLayout>
              <Settings />
            </AppLayout>
          </ProtectedRoute>
        }
        />

        {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
