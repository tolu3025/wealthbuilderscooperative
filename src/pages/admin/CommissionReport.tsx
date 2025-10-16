import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, Users, TrendingUp, Check } from "lucide-react";
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

interface DirectorAllocation {
  id: string;
  member_name: string;
  amount: number;
  status: string;
  settlement_month: string;
}

const CommissionReport = () => {
  const [referralCommissions, setReferralCommissions] = useState<CommissionData[]>([]);
  const [stateRepCommissions, setStateRepCommissions] = useState<CommissionData[]>([]);
  const [directorAllocations, setDirectorAllocations] = useState<DirectorAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReferral: 0,
    totalStateRep: 0,
    totalDirector: 0,
    pendingReferral: 0,
    pendingStateRep: 0,
    pendingDirector: 0,
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

      // Fetch director allocations
      const { data: allocations } = await supabase
        .from('financial_allocations')
        .select(`
          *,
          registration_fees!financial_allocations_registration_id_fkey(
            member_id,
            profiles!registration_fees_member_id_fkey(first_name, last_name)
          )
        `)
        .eq('allocation_type', 'directors')
        .order('settlement_month', { ascending: false });

      const directors: DirectorAllocation[] = [];
      let totalDir = 0, pendingDir = 0;

      allocations?.forEach((alloc: any) => {
        const profile = alloc.registration_fees?.profiles;
        directors.push({
          id: alloc.id,
          member_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
          amount: Number(alloc.amount),
          status: alloc.status,
          settlement_month: alloc.settlement_month,
        });

        if (alloc.status === 'settled') totalDir += Number(alloc.amount);
        else pendingDir += Number(alloc.amount);
      });

      setReferralCommissions(referrals);
      setStateRepCommissions(stateReps);
      setDirectorAllocations(directors);
      setStats({
        totalReferral: totalRef,
        totalStateRep: totalSR,
        totalDirector: totalDir,
        pendingReferral: pendingRef,
        pendingStateRep: pendingSR,
        pendingDirector: pendingDir,
      });
    } catch (error: any) {
      toast.error("Failed to load commissions: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const approveCommission = async (id: string, type: 'commission' | 'allocation') => {
    try {
      if (type === 'commission') {
        // Optimistic update
        if (type === 'commission') {
          setReferralCommissions(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c));
          setStateRepCommissions(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c));
        }

        const { data, error } = await supabase
          .from('commissions')
          .update({ status: 'approved' })
          .eq('id', id)
          .select();

        if (error) {
          console.error('Commission update error:', error);
          throw error;
        }
        
        console.log('Commission updated successfully:', data);
        toast.success("Commission approved successfully");
      } else {
        // Optimistic update for allocations
        setDirectorAllocations(prev => prev.map(a => a.id === id ? { ...a, status: 'settled' } : a));

        const { data, error } = await supabase
          .from('financial_allocations')
          .update({ status: 'settled', settled_at: new Date().toISOString() })
          .eq('id', id)
          .select();

        if (error) {
          console.error('Allocation update error:', error);
          throw error;
        }

        console.log('Allocation updated successfully:', data);
        toast.success("Allocation settled successfully");
      }
      
      // Refresh data from database
      await fetchCommissions();
    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error("Failed to approve: " + error.message);
      // Revert optimistic update on error
      fetchCommissions();
    }
  };

  const CommissionTable = ({ data, type }: { data: CommissionData[], type: 'commission' }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
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
              <TableCell>
                {comm.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => approveCommission(comm.id, type)}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const DirectorTable = ({ data }: { data: DirectorAllocation[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Month</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              No allocations found
            </TableCell>
          </TableRow>
        ) : (
          data.map((alloc) => (
            <TableRow key={alloc.id}>
              <TableCell className="font-medium">{alloc.member_name}</TableCell>
              <TableCell className="font-semibold text-green-600">
                ₦{alloc.amount.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant={alloc.status === 'settled' ? 'default' : 'secondary'}>
                  {alloc.status}
                </Badge>
              </TableCell>
              <TableCell>{format(new Date(alloc.settlement_month), 'MMM yyyy')}</TableCell>
              <TableCell>
                {alloc.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => approveCommission(alloc.id, 'allocation')}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Settle
                  </Button>
                )}
              </TableCell>
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

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Invite (Approved)
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
                    Invite (Pending)
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

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Director (Settled)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ₦{stats.totalDirector.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Director (Pending)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    ₦{stats.pendingDirector.toLocaleString()}
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
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="referral">
                      Invite Rewards ({referralCommissions.length})
                    </TabsTrigger>
                    <TabsTrigger value="state_rep">
                      State Rep ({stateRepCommissions.length})
                    </TabsTrigger>
                    <TabsTrigger value="director">
                      Director ({directorAllocations.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="referral" className="mt-4">
                    <CommissionTable data={referralCommissions} type="commission" />
                  </TabsContent>
                  <TabsContent value="state_rep" className="mt-4">
                    <CommissionTable data={stateRepCommissions} type="commission" />
                  </TabsContent>
                  <TabsContent value="director" className="mt-4">
                    <DirectorTable data={directorAllocations} />
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
