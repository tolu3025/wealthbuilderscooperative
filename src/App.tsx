import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import LoadingBar from "@/components/LoadingBar";
import ScrollToTop from "@/components/ScrollToTop";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/admin/AdminDashboard";
import PendingRegistrations from "./pages/admin/PendingRegistrations";
import Registrations from "./pages/admin/Registrations";
import Contributions from "./pages/admin/Contributions";
import Withdrawals from "./pages/admin/Withdrawals";
import AdminDividends from "./pages/admin/Dividends";
import AdminProperties from "./pages/admin/Properties";
import StateReps from "./pages/admin/StateReps";
import UserManagement from "./pages/admin/UserManagement";
import BlogManagement from "./pages/admin/BlogManagement";
import Reports from "./pages/admin/Reports";
import Properties from "./pages/Properties";
import Register from "./pages/Register";
import UploadReceipt from "./pages/UploadReceipt";
import Contribute from "./pages/Contribute";
import Withdraw from "./pages/Withdraw";
import About from "./pages/About";
import Blog from "./pages/Blog";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Policy from "./pages/Policy";
import Services from "./pages/Services";
import NotFound from "./pages/NotFound";
import MemberDividends from "./pages/member/Dividends";
import Referrals from "./pages/member/Referrals";
import Profile from "./pages/member/Profile";
import ChangePassword from "./pages/member/ChangePassword";
import StateRepDashboard from "./pages/StateRepDashboard";
import DirectorDashboard from "./pages/DirectorDashboard";
import MonthlySettlements from "./pages/admin/MonthlySettlements";
import CommissionReport from "./pages/admin/CommissionReport";
import WithdrawalHistory from "./pages/admin/WithdrawalHistory";
import MemberBalanceAdjustment from "./pages/admin/MemberBalanceAdjustment";
import MLMManagement from "./pages/admin/BonusDistribution";
import PropertyPlans from "./pages/member/PropertyPlans";
import PlanEnrollments from "./pages/admin/PlanEnrollments";
import ProjectSupportFund from "./pages/admin/ProjectSupportFund";
import AccountUpgrades from "./pages/admin/AccountUpgrades";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <LoadingBar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Policy />} />
            <Route path="/services" element={<Services />} />
            <Route path="/properties" element={<Properties />} />
            <Route
              path="/login"
              element={
                <ProtectedRoute requireAuth={false}>
                  <Login />
                </ProtectedRoute>
              }
            />
            <Route
              path="/register"
              element={
                <ProtectedRoute requireAuth={false}>
                  <Register />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <ProtectedRoute requireAuth={false}>
                  <ForgotPassword />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <ProtectedRoute requireAuth={false}>
                  <ResetPassword />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload-receipt"
              element={
                <ProtectedRoute>
                  <UploadReceipt />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contribute"
              element={
                <ProtectedRoute>
                  <Contribute />
                </ProtectedRoute>
              }
            />
            <Route
              path="/withdraw"
              element={
                <ProtectedRoute>
                  <Withdraw />
                </ProtectedRoute>
              }
            />
            <Route
              path="/member/dividends"
              element={
                <ProtectedRoute>
                  <MemberDividends />
                </ProtectedRoute>
              }
            />
            <Route
              path="/member/referrals"
              element={
                <ProtectedRoute>
                  <Referrals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/member/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/member/property-plans"
              element={
                <ProtectedRoute>
                  <PropertyPlans />
                </ProtectedRoute>
              }
            />
            <Route
              path="/member/change-password"
              element={
                <ProtectedRoute>
                  <ChangePassword />
                </ProtectedRoute>
              }
            />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/registrations" element={<AdminRoute><PendingRegistrations /></AdminRoute>} />
            <Route path="/admin/account-upgrades" element={<AdminRoute><AccountUpgrades /></AdminRoute>} />
            <Route path="/admin/contributions" element={<AdminRoute><Contributions /></AdminRoute>} />
            <Route path="/admin/withdrawals" element={<AdminRoute><Withdrawals /></AdminRoute>} />
            <Route path="/admin/dividends" element={<AdminRoute><AdminDividends /></AdminRoute>} />
            <Route path="/admin/properties" element={<AdminRoute><AdminProperties /></AdminRoute>} />
            <Route path="/admin/state-reps" element={<AdminRoute><StateReps /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
            <Route path="/admin/blog" element={<AdminRoute><BlogManagement /></AdminRoute>} />
            <Route path="/admin/commissions" element={<AdminRoute><CommissionReport /></AdminRoute>} />
            <Route path="/admin/settlements" element={<AdminRoute><MonthlySettlements /></AdminRoute>} />
            <Route path="/admin/withdrawal-history" element={<AdminRoute><WithdrawalHistory /></AdminRoute>} />
            <Route path="/admin/balance-adjustment" element={<AdminRoute><MemberBalanceAdjustment /></AdminRoute>} />
            <Route path="/admin/mlm" element={<AdminRoute><MLMManagement /></AdminRoute>} />
            <Route path="/admin/plan-enrollments" element={<AdminRoute><PlanEnrollments /></AdminRoute>} />
            <Route path="/admin/project-support" element={<AdminRoute><ProjectSupportFund /></AdminRoute>} />
            <Route path="/admin/reports" element={<AdminRoute><Reports /></AdminRoute>} />
            <Route path="/state-rep" element={<ProtectedRoute><StateRepDashboard /></ProtectedRoute>} />
            <Route path="/director" element={<ProtectedRoute><DirectorDashboard /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
