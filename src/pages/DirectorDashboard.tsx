import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, DollarSign, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MemberSidebar } from "@/components/MemberSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { WhatsAppCommunityBanner } from "@/components/WhatsAppCommunityBanner";
import { format } from "date-fns";

interface MonthlyAllocation {
  month: string;
  registrations: number;
  commission: number;
  status: string;
}

const DirectorDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [allocations, setAllocations] = useState<MonthlyAllocation[]>([]);
  const [totalSettled, setTotalSettled] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [currentMonthTotal, setCurrentMonthTotal] = useState(0);
  const [userName, setUserName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error("Profile not found");
      setUserName(`${profile.first_name} ${profile.last_name}`);

      // Get financial allocations for directors
      const { data: allocationData } = await supabase
        .from('financial_allocations')
        .select('*')
        .eq('allocation_type', 'directors')
        .order('settlement_month', { ascending: false });

      if (allocationData) {
        // Group by month
        const monthlyStats: { [key: string]: { count: number; amount: number; status: string } } = {};
        
        allocationData.forEach(allocation => {
          const month = format(new Date(allocation.settlement_month), 'MMMM yyyy');
          if (!monthlyStats[month]) {
            monthlyStats[month] = { count: 0, amount: 0, status: allocation.status };
          }
          monthlyStats[month].count += 1;
          monthlyStats[month].amount += Number(allocation.amount);
        });

        const formatted = Object.entries(monthlyStats).map(([month, stats]) => ({
          month,
          registrations: stats.count,
          commission: stats.amount,
          status: stats.status
        }));

        setAllocations(formatted);

        // Calculate totals
        const settled = allocationData
          .filter(a => a.status === 'settled')
          .reduce((sum, a) => sum + Number(a.amount), 0);
        
        const pending = allocationData
          .filter(a => a.status === 'pending')
          .reduce((sum, a) => sum + Number(a.amount), 0);

        setTotalSettled(settled);
        setPendingAmount(pending);

        // Current month
        const currentMonth = format(new Date(), 'yyyy-MM');
        const currentMonthData = allocationData.filter(a => 
          a.settlement_month.startsWith(currentMonth)
        );
        const current = currentMonthData.reduce((sum, a) => sum + Number(a.amount), 0);
        setCurrentMonthTotal(current);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <MemberSidebar />
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
        <MemberSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader userName={userName} />
          <main className="flex-1 p-6 bg-muted/30 overflow-auto">
            <AnnouncementBanner />
            
            <div className="mb-6">
              <WhatsAppCommunityBanner />
            </div>
            
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Director Dashboard</h1>
              <p className="text-muted-foreground">Commission and allocation overview</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Current Month
                  </CardTitle>
                  <Building2 className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    ₦{currentMonthTotal.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Directors share
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Settled
                  </CardTitle>
                  <DollarSign className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    ₦{totalSettled.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Paid allocations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pending
                  </CardTitle>
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    ₦{pendingAmount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Awaiting settlement
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Breakdown</CardTitle>
                <CardDescription>
                  Director commission by month (₦700 per registration)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allocations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No allocations yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Registrations</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocations.map((data, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{data.month}</TableCell>
                          <TableCell>{data.registrations}</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            ₦{data.commission.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={data.status === 'settled' ? 'default' : 'secondary'}>
                              {data.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DirectorDashboard;
