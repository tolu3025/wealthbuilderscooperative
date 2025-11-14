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
      
      // For each contribution, check if there's a project support payment
      const contributionsWithProjectSupport = await Promise.all(
        (data || []).map(async (contrib) => {
          const { data: projectSupports } = await supabase
            .from('project_support_contributions')
            .select('id, amount, payment_status, receipt_url')
            .eq('member_id', contrib.member_id)
            .eq('contribution_month', contrib.contribution_month || new Date(contrib.created_at).toISOString().slice(0, 7) + '-01')
            .order('created_at', { ascending: false });
          
          // Get the most recent project support payment
          const projectSupport = projectSupports && projectSupports.length > 0 ? projectSupports[0] : null;
          
          return {
            ...contrib,
            project_support_payment: projectSupport
          };
        })
      );
      
      setPendingContribs(contributionsWithProjectSupport);
    } catch (error: any) {
      console.error('Error fetching contributions:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const approveContribution = async (contributionId: string, memberId: string, projectSupportPaymentId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get member's user_id and admin profile id
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, id')
        .eq('id', memberId)
        .single();

      if (!profile) throw new Error('Member not found');
      
      // Get admin profile id
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .single();
        
      if (!adminProfile) throw new Error('Admin profile not found');

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

      // If there's an associated project support payment, approve it too
      if (projectSupportPaymentId) {
        const { error: projectSupportError } = await supabase
          .from('project_support_contributions')
          .update({
            payment_status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: adminProfile.id
          })
          .eq('id', projectSupportPaymentId);

        if (projectSupportError) {
          console.error('Error approving project support:', projectSupportError);
        }
      }

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
      const urlParts = receiptUrl.split('/storage/v1/object/public/payment-receipts/');
      if (urlParts.length < 2) throw new Error('Invalid receipt URL');
      
      const filePath = urlParts[1];
      const { data, error } = await supabase.storage
        .from('payment-receipts')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'receipt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Receipt downloaded successfully');
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download receipt');
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
              <h1 className="text-3xl font-bold mb-2">Contribution Management</h1>
              <p className="text-muted-foreground">
                Review and approve member contributions (including project support fund payments)
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Pending Contributions ({pendingContribs.length})</CardTitle>
                <CardDescription>
                  Verify payment receipts and approve member monthly contributions. Project support fund status shown in orange column.
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
                          <TableHead className="text-orange-600">Project Fund</TableHead>
                          <TableHead>Receipt</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingContribs.map((contrib: any) => {
                          const hasProjectSupport = contrib.project_support_payment && contrib.project_support_payment.payment_status === 'pending';
                          
                          return (
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
                              <TableCell>
                                {hasProjectSupport ? (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-orange-600 font-medium">
                                      ₦{Number(contrib.project_support_payment.amount).toLocaleString()}
                                    </span>
                                    {contrib.project_support_payment.receipt_url ? (
                                      <Badge variant="outline" className="text-xs w-fit">Paid - Pending Approval</Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">No Receipt</Badge>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Not Paid</Badge>
                                )}
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
                                  onClick={() => approveContribution(
                                    contrib.id, 
                                    contrib.member_id,
                                    hasProjectSupport ? contrib.project_support_payment.id : undefined
                                  )}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve{hasProjectSupport ? ' Both' : ''}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
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
