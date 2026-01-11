import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, DollarSign, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MemberSidebar } from "@/components/MemberSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { WhatsAppCommunityBanner } from "@/components/WhatsAppCommunityBanner";
import { format } from "date-fns";

interface MonthlyData {
  month: string;
  registrations: number;
  commission: number;
  status: string;
}

const StateRepDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [repState, setRepState] = useState("");
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [pendingCommission, setPendingCommission] = useState(0);
  const [currentMonthCount, setCurrentMonthCount] = useState(0);
  const [userName, setUserName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile and assigned state
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error("Profile not found");
      setUserName(`${profile.first_name} ${profile.last_name}`);

      const { data: stateRep, error: stateRepError } = await supabase
        .from('state_representatives')
        .select('state')
        .eq('rep_profile_id', profile.id)
        .maybeSingle();

      if (stateRepError) {
        console.error('Error fetching state rep:', stateRepError);
        toast({
          title: "Error",
          description: "Failed to load state representative data.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!stateRep) {
        toast({
          title: "Not Assigned",
          description: "You are not assigned as a state representative yet.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setRepState(stateRep.state);

      // Get all commissions for this state rep
      const { data: commissions, error: commissionsError } = await supabase
        .from('commissions')
        .select('*')
        .eq('member_id', profile.id)
        .eq('commission_type', 'state_rep');

      if (commissionsError) {
        console.error('Error fetching commissions:', commissionsError);
      }

      console.log('State Rep Commissions:', commissions);

      // Calculate totals
      const approved = commissions?.filter(c => c.status === 'approved').reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const pending = commissions?.filter(c => c.status === 'pending').reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      
      console.log('Approved total:', approved, 'Pending total:', pending);
      
      setTotalEarned(approved);
      setPendingCommission(pending);

      // Get current month registrations
      const currentMonth = format(new Date(), 'yyyy-MM');
      const { data: members } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('state', stateRep.state)
        .eq('registration_status', 'active')
        .gte('created_at', `${currentMonth}-01`);

      setCurrentMonthCount(members?.length || 0);

      // Group by month with commission status
      const monthlyStats: { [key: string]: { count: number; approvedCount: number } } = {};
      
      commissions?.forEach(commission => {
        const month = format(new Date(commission.created_at), 'yyyy-MM');
        if (!monthlyStats[month]) {
          monthlyStats[month] = { count: 0, approvedCount: 0 };
        }
        monthlyStats[month].count += 1;
        if (commission.status === 'approved') {
          monthlyStats[month].approvedCount += 1;
        }
      });

      const formattedData = Object.entries(monthlyStats).map(([month, data]) => {
        const allApproved = data.approvedCount === data.count;
        const someApproved = data.approvedCount > 0 && data.approvedCount < data.count;
        
        return {
          month: format(new Date(month + '-01'), 'MMMM yyyy'),
          registrations: data.count,
          commission: data.count * 100,
          status: allApproved ? 'approved' : someApproved ? 'partial' : 'pending'
        };
      }).sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());

      setMonthlyData(formattedData);
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
              <h1 className="text-3xl font-bold mb-2">State Representative Dashboard</h1>
              <p className="text-muted-foreground">Managing registrations for {repState} State</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Current Month
                  </CardTitle>
                  <Users className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    {currentMonthCount}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    New registrations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Earned
                  </CardTitle>
                  <DollarSign className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    ₦{totalEarned.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Approved commissions
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
                    ₦{pendingCommission.toLocaleString()}
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
                  Commission earnings by month (₦100 per registration)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No registrations yet
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
                      {monthlyData.map((data, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{data.month}</TableCell>
                          <TableCell>{data.registrations}</TableCell>
                          <TableCell className="font-semibold text-green-600">
                            ₦{data.commission.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{data.status}</Badge>
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

export default StateRepDashboard;
