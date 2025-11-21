import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Users, DollarSign, TrendingUp, ArrowDownLeft, UserCheck, Wallet, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

interface DashboardStats {
  totalMembers: number;
  totalCapital: number;
  pendingRegistrations: number;
  pendingContributions: number;
  pendingWithdrawals: number;
  monthlyContributions: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
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
      // Fetch total members
      const { count: membersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total capital
      const { data: contributions } = await supabase
        .from('contributions')
        .select('capital_amount')
        .eq('payment_status', 'approved');
      const totalCapital = contributions?.reduce((sum, c) => sum + Number(c.capital_amount), 0) || 0;

      // Fetch pending registrations count
      const { count: pendingRegsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('registration_status', 'pending_approval');

      // Fetch pending contributions count
      const { count: pendingContribsCount } = await supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'pending');

      // Fetch pending withdrawals count
      const { count: withdrawalsCount } = await supabase
        .from('withdrawal_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch monthly contributions (current month) - capital only
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { data: monthlyContribs } = await supabase
        .from('contributions')
        .select('capital_amount')
        .eq('payment_status', 'approved')
        .gte('created_at', startOfMonth.toISOString());
      const monthlyTotal = monthlyContribs?.reduce((sum, c) => sum + Number(c.capital_amount), 0) || 0;

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
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
          <main className="flex-1 p-6 overflow-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Manage cooperative operations and finances
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-8">
              <Card className="border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMembers}</div>
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
                  <div className="text-xl md:text-2xl font-bold">
                    ₦{(stats.totalCapital / 1000000).toFixed(1)}M
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Pending Regs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {stats.pendingRegistrations}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Pending Contribs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.pendingContributions}
                  </div>
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
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.pendingWithdrawals}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Capital This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl md:text-2xl font-bold text-green-600">
                    ₦{(stats.monthlyContributions / 1000).toFixed(0)}K
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/registrations')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Pending Registrations
                  </CardTitle>
                  <CardDescription>
                    {stats.pendingRegistrations} new members awaiting approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Review Registrations</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/contributions')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Pending Contributions
                  </CardTitle>
                  <CardDescription>
                    {stats.pendingContributions} contributions pending approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Review Contributions</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/withdrawals')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowDownLeft className="h-5 w-5" />
                    Pending Withdrawals
                  </CardTitle>
                  <CardDescription>
                    {stats.pendingWithdrawals} withdrawal requests to process
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Process Withdrawals</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/dividends')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Dividend Distribution
                  </CardTitle>
                  <CardDescription>
                    Calculate and distribute member dividends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">Manage Dividends</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/commissions')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Commission Report
                  </CardTitle>
                  <CardDescription>
                    View and approve commission payments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">View Commissions</Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/admin/reports')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Reports & Export
                  </CardTitle>
                  <CardDescription>
                    Generate and download reports
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">View Reports</Button>
                </CardContent>
              </Card>
            </div>

            {/* Overview Section */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Welcome to WealthBuilders Admin</CardTitle>
                <CardDescription>
                  Use the sidebar menu to navigate to different sections of the admin panel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Quick Access:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Registrations - Approve new member applications</li>
                    <li>Contributions - Review and approve monthly contributions</li>
                    <li>Withdrawals - Process member withdrawal requests</li>
                    <li>Dividends - Distribute profits to eligible members</li>
                    <li>Properties - Manage property listings</li>
                    <li>Commissions - Review invite and state rep commissions</li>
                    <li>Monthly Settlements - Generate financial reports</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
