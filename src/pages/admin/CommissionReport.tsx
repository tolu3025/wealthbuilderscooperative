import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { format } from "date-fns";

interface CommissionData {
  id: string;
  member_name: string;
  amount: number;
  commission_type: string;
  status: string;
  created_at: string;
}

const CommissionReport = () => {
  const [referralCommissions, setReferralCommissions] = useState<CommissionData[]>([]);
  const [stateRepCommissions, setStateRepCommissions] = useState<CommissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReferral: 0,
    totalStateRep: 0,
    pendingReferral: 0,
    pendingStateRep: 0,
  });

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      // Fetch all commissions with member names
      const { data: commissions, error } = await supabase
        .from('commissions')
        .select(`
          *,
          profiles!commissions_member_id_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const referrals: CommissionData[] = [];
      const stateReps: CommissionData[] = [];
      let totalRef = 0, totalSR = 0, pendingRef = 0, pendingSR = 0;

      commissions?.forEach((comm: any) => {
        const profile = comm.profiles;
        const data: CommissionData = {
          id: comm.id,
          member_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
          amount: Number(comm.amount),
          commission_type: comm.commission_type,
          status: comm.status,
          created_at: comm.created_at,
        };

        if (comm.commission_type === 'referral') {
          referrals.push(data);
          if (comm.status === 'approved') totalRef += Number(comm.amount);
          else pendingRef += Number(comm.amount);
        } else if (comm.commission_type === 'state_rep') {
          stateReps.push(data);
          if (comm.status === 'approved') totalSR += Number(comm.amount);
          else pendingSR += Number(comm.amount);
        }
      });

      setReferralCommissions(referrals);
      setStateRepCommissions(stateReps);
      setStats({
        totalReferral: totalRef,
        totalStateRep: totalSR,
        pendingReferral: pendingRef,
        pendingStateRep: pendingSR,
      });
    } catch (error: any) {
      toast.error("Failed to load commissions: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const CommissionTable = ({ data }: { data: CommissionData[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              No commissions found
            </TableCell>
          </TableRow>
        ) : (
          data.map((comm) => (
            <TableRow key={comm.id}>
              <TableCell className="font-medium">{comm.member_name}</TableCell>
              <TableCell className="font-semibold text-green-600">
                ₦{comm.amount.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant={comm.status === 'approved' ? 'default' : 'secondary'}>
                  {comm.status}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(comm.created_at), 'MMM dd, yyyy')}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

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
          <main className="flex-1 p-6 space-y-6 overflow-auto">
            <div>
              <h1 className="text-3xl font-bold mb-2">Commission Report</h1>
              <p className="text-muted-foreground">
                View all invite and state representative commissions
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Invite Rewards (Approved)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ₦{stats.totalReferral.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Invite Rewards (Pending)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    ₦{stats.pendingReferral.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    State Rep (Approved)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ₦{stats.totalStateRep.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    State Rep (Pending)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    ₦{stats.pendingStateRep.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Commission Details</CardTitle>
                <CardDescription>
                  All commission transactions by type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="referral">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="referral">
                      Invite Rewards ({referralCommissions.length})
                    </TabsTrigger>
                    <TabsTrigger value="state_rep">
                      State Rep Commissions ({stateRepCommissions.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="referral" className="mt-4">
                    <CommissionTable data={referralCommissions} />
                  </TabsContent>
                  <TabsContent value="state_rep" className="mt-4">
                    <CommissionTable data={stateRepCommissions} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default CommissionReport;
