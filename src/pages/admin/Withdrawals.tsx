import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

const Withdrawals = () => {
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingWithdrawals();
  }, []);

  const fetchPendingWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          profiles!withdrawal_requests_member_id_fkey(first_name, last_name, member_number)
        `)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingWithdrawals(data || []);
    } catch (error: any) {
      console.error('Error fetching withdrawals:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const approveWithdrawal = async (withdrawalId: string, memberId: string, amount: number) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', memberId)
        .single();

      if (!profile) throw new Error('Member not found');

      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawalId);

      if (updateError) throw updateError;

      // Add to monthly settlements
      const settlementMonth = new Date().toISOString().slice(0, 7);
      await supabase.rpc('add_withdrawal_to_settlement', {
        p_month: settlementMonth,
        p_amount: amount
      });

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: profile.user_id,
          title: 'Withdrawal Approved',
          message: 'Your withdrawal request has been approved and will be processed shortly.',
          type: 'withdrawal_status',
          related_id: withdrawalId
        });

      if (notifError) console.error('Failed to send notification:', notifError);
      
      toast.success("Withdrawal approved and added to monthly settlement");
      fetchPendingWithdrawals();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const completeWithdrawal = async (withdrawalId: string, memberId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', memberId)
        .single();

      if (!profile) throw new Error('Member not found');

      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'completed'
        })
        .eq('id', withdrawalId);

      if (updateError) throw updateError;

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: profile.user_id,
          title: 'Withdrawal Completed',
          message: 'Your withdrawal is now on its way to your bank account. Please allow 1-3 business days for the funds to reflect.',
          type: 'withdrawal_status',
          related_id: withdrawalId
        });

      if (notifError) console.error('Failed to send notification:', notifError);
      
      toast.success("Withdrawal marked as completed and member notified");
      fetchPendingWithdrawals();
    } catch (error: any) {
      toast.error(error.message);
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
              <h1 className="text-3xl font-bold mb-2">Withdrawal Requests</h1>
              <p className="text-muted-foreground">
                Review and process member withdrawal requests
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Requests ({pendingWithdrawals.length})</CardTitle>
                <CardDescription>
                  Approve, process and complete withdrawal payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingWithdrawals.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm sm:text-base">No pending withdrawals</p>
                ) : (
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Bank Details</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingWithdrawals.map((withdrawal: any) => (
                        <TableRow key={withdrawal.id}>
                           <TableCell className="font-medium">
                             {withdrawal.profiles?.first_name} {withdrawal.profiles?.last_name}
                             <br />
                             <span className="text-xs text-muted-foreground">
                               {withdrawal.profiles?.member_number}
                             </span>
                             <br />
                             <Badge variant={withdrawal.status === 'approved' ? 'default' : 'secondary'} className="mt-1">
                               {withdrawal.status}
                             </Badge>
                           </TableCell>
                          <TableCell className="font-bold text-lg">
                            ₦{Number(withdrawal.amount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="font-medium">{withdrawal.account_name}</div>
                              <div className="text-muted-foreground">{withdrawal.bank_name}</div>
                              <div className="font-mono">{withdrawal.account_number}</div>
                            </div>
                          </TableCell>
                          <TableCell>{new Date(withdrawal.requested_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right space-x-2">
                            {withdrawal.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => approveWithdrawal(withdrawal.id, withdrawal.member_id, withdrawal.amount)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve & Process
                              </Button>
                            )}
                            {withdrawal.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => completeWithdrawal(withdrawal.id, withdrawal.member_id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Mark as Completed
                              </Button>
                            )}
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

export default Withdrawals;
