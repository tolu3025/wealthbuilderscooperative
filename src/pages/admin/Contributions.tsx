import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

const Contributions = () => {
  const [pendingContribs, setPendingContribs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingContributions();
  }, []);

  const fetchPendingContributions = async () => {
    try {
      const { data, error } = await supabase
        .from('contributions')
        .select(`
          *,
          profiles!contributions_member_id_fkey(first_name, last_name, member_number)
        `)
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingContribs(data || []);
    } catch (error: any) {
      console.error('Error fetching contributions:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const approveContribution = async (contributionId: string, memberId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get member's user_id first
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', memberId)
        .single();

      if (!profile) throw new Error('Member not found');

      // Approve contribution
      const { error: updateError } = await supabase
        .from('contributions')
        .update({
          payment_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id
        })
        .eq('id', contributionId);

      if (updateError) throw updateError;

      // Send notification to member
      await supabase
        .from('notifications')
        .insert({
          user_id: profile.user_id,
          title: 'Contribution Approved',
          message: 'Your monthly contribution has been approved and added to your account.',
          type: 'contribution_approval',
          related_id: contributionId
        });
      
      toast.success("Contribution approved successfully");
      
      // Immediately refetch to update UI
      await fetchPendingContributions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const downloadReceipt = async (receiptUrl: string) => {
    try {
      const response = await fetch(receiptUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error('Failed to download receipt');
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
          <main className="flex-1 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">
            <div>
              <h1 className="text-3xl font-bold mb-2">Contribution Approvals</h1>
              <p className="text-muted-foreground">
                Review and approve member monthly contributions
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Pending Contributions ({pendingContribs.length})</CardTitle>
                <CardDescription>
                  Verify payment receipts and approve contributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingContribs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm sm:text-base">No pending contributions</p>
                ) : (
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-green-600">Capital</TableHead>
                        <TableHead className="text-blue-600">Savings</TableHead>
                        <TableHead className="text-orange-600">Project</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingContribs.map((contrib: any) => (
                        <TableRow key={contrib.id}>
                          <TableCell className="font-medium">
                            {contrib.profiles?.first_name} {contrib.profiles?.last_name}
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {contrib.profiles?.member_number}
                            </span>
                          </TableCell>
                          <TableCell>₦{Number(contrib.amount).toLocaleString()}</TableCell>
                          <TableCell className="text-green-600 font-medium">
                            ₦{Number(contrib.capital_amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-blue-600 font-medium">
                            ₦{Number(contrib.savings_amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-orange-600 font-medium">
                            ₦{Number(contrib.project_support_amount || 500).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {contrib.receipt_url ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => downloadReceipt(contrib.receipt_url)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            ) : (
                              <Badge variant="secondary">No receipt</Badge>
                            )}
                          </TableCell>
                          <TableCell>{new Date(contrib.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => approveContribution(contrib.id, contrib.member_id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Contributions;
