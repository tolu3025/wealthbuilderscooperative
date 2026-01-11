import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, TrendingUp, AlertCircle, ArrowDownLeft, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { WhatsAppCommunityBanner } from "@/components/WhatsAppCommunityBanner";

interface DashboardStats {
  totalMembers: number;
  totalCapital: number;
  pendingRegistrations: number;
  pendingContributions: number;
  pendingWithdrawals: number;
  monthlyContributions: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    totalCapital: 0,
    pendingRegistrations: 0,
    pendingContributions: 0,
    pendingWithdrawals: 0,
    monthlyContributions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { count: membersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { data: contributions } = await supabase
        .from('contributions')
        .select('capital_amount');
      const totalCapital = contributions?.reduce((sum, c) => sum + Number(c.capital_amount), 0) || 0;

      const { count: pendingRegsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('registration_status', 'pending_approval');

      const { count: pendingContribsCount } = await supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'pending');

      const { count: withdrawalsCount } = await supabase
        .from('withdrawal_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { data: monthlyContribs } = await supabase
        .from('contributions')
        .select('amount')
        .gte('created_at', startOfMonth.toISOString());
      const monthlyTotal = monthlyContribs?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      setStats({
        totalMembers: membersCount || 0,
        totalCapital,
        pendingRegistrations: pendingRegsCount || 0,
        pendingContributions: pendingContribsCount || 0,
        pendingWithdrawals: withdrawalsCount || 0,
        monthlyContributions: monthlyTotal
      });
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AdminSidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader userName="Admin" />
          <main className="flex-1 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Manage cooperative operations and finances
              </p>
            </div>

            <div className="mb-4 sm:mb-6">
              <WhatsAppCommunityBanner />
            </div>

            <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              <Card className="border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-1 sm:gap-2">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Total</span> Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-xl md:text-2xl font-bold">{stats.totalMembers}</div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-secondary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Capital
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold">₦{(stats.totalCapital / 1000000).toFixed(1)}M</div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Pending Regs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{stats.pendingRegistrations}</div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Pending Contribs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.pendingContributions}</div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <ArrowDownLeft className="h-4 w-4" />
                    Pending Withdrawals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{stats.pendingWithdrawals}</div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold text-green-600">
                    ₦{(stats.monthlyContributions / 1000).toFixed(0)}K
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Welcome to the admin dashboard. Use the sidebar to navigate to different management sections.
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
