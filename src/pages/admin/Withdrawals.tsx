import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
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
          profiles!withdrawal_requests_member_id_fkey(first_name, last_name, member_number, id)
        `)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch balances for each member
      const withdrawalsWithBalances = await Promise.all(
        (data || []).map(async (withdrawal: any) => {
          const memberId = withdrawal.profiles?.id;
          
          // Fetch member balance
          const { data: balance } = await supabase
            .from('member_balances')
            .select('total_savings, total_capital, total_commissions, total_dividends')
            .eq('member_id', memberId)
            .single();

          const bonusBalance = balance?.total_commissions || 0;
          const dividendBalance = balance?.total_dividends || 0;

          return {
            ...withdrawal,
            balances: {
              savings: balance?.total_savings || 0,
              capital: balance?.total_capital || 0,
              dividend: dividendBalance,
              bonus: bonusBalance
            }
          };
        })
      );

      setPendingWithdrawals(withdrawalsWithBalances);
    } catch (error: any) {
      console.error('Error fetching withdrawals:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const approveWithdrawal = async (withdrawalId: string, memberId: string, amount: number, withdrawalType: string = 'savings') => {
    try {
      // Get member profile and balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', memberId)
        .single();

      if (!profile) throw new Error('Member not found');

      const { data: balance } = await supabase
        .from('member_balances')
        .select('total_savings, total_capital, total_commissions, total_dividends, months_contributed')
        .eq('member_id', memberId)
        .single();

      if (!balance) throw new Error('Member balance not found');

      const bonusBalance = balance.total_commissions || 0;
      const dividendBalance = balance.total_dividends || 0;

      // Validate based on withdrawal type
      if (withdrawalType === 'savings') {
        if (amount > balance.total_savings) {
          throw new Error('Insufficient savings balance');
        }
      } else if (withdrawalType === 'capital') {
        if (amount > balance.total_capital) {
          throw new Error('Insufficient capital balance');
        }
        // Check minimum capital requirement for capital withdrawals only
        if (balance.total_capital - amount < 50000) {
          throw new Error('Cannot approve: Withdrawal would drop capital below ₦50,000 minimum');
        }
      } else if (withdrawalType === 'dividend') {
        if (amount > dividendBalance) {
          throw new Error('Insufficient dividend balance');
        }
      } else if (withdrawalType === 'bonus') {
        if (amount > bonusBalance) {
          throw new Error('Insufficient bonus balance');
        }
      }

      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawalId);

      if (updateError) throw updateError;

      // Add to monthly settlements
      const settlementMonth = new Date().toISOString().slice(0, 7) + '-01';
      const { data: existingSettlement } = await supabase
        .from('monthly_settlements')
        .select('id, total_withdrawals')
        .eq('settlement_month', settlementMonth)
        .single();

      if (existingSettlement) {
        await supabase
          .from('monthly_settlements')
          .update({
            total_withdrawals: (existingSettlement.total_withdrawals || 0) + amount
          })
          .eq('id', existingSettlement.id);
      } else {
        await supabase
          .from('monthly_settlements')
          .insert({
            settlement_month: settlementMonth,
            total_withdrawals: amount,
            status: 'pending'
          });
      }

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: profile.user_id,
          title: 'Withdrawal Approved',
          message: `Your ${withdrawalType} withdrawal of ₦${amount.toLocaleString()} has been approved and will be processed shortly.`,
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

      // Mark as completed (payment sent)
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawalId);

      if (updateError) throw updateError;

      // Send notification
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: profile.user_id,
          title: 'Withdrawal Completed',
          message: 'Your withdrawal has been processed successfully. Funds should reflect in your account within 1-3 business days.',
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
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Available Balance</TableHead>
                        <TableHead>Bank Details</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {pendingWithdrawals.map((withdrawal: any) => {
                        const withdrawalType = withdrawal.withdrawal_type || 'savings';
                        const typeBalance = withdrawal.balances?.[withdrawalType] || 0;
                        const hasSufficientBalance = withdrawal.amount <= typeBalance;
                        
                        return (
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
                           <TableCell>
                             <Badge variant="outline" className="capitalize">
                               {withdrawalType}
                             </Badge>
                           </TableCell>
                          <TableCell className="font-bold text-lg">
                            ₦{Number(withdrawal.amount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className={`font-semibold ${hasSufficientBalance ? 'text-green-600' : 'text-red-600'}`}>
                                ₦{typeBalance.toLocaleString()}
                              </div>
                              {!hasSufficientBalance && (
                                <div className="flex items-center gap-1 text-xs text-red-600">
                                  <AlertCircle className="h-3 w-3" />
                                  Insufficient
                                </div>
                              )}
                              {hasSufficientBalance && (
                                <div className="text-xs text-green-600">
                                  ✓ Sufficient
                                </div>
                              )}
                            </div>
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
                                 onClick={() => approveWithdrawal(withdrawal.id, withdrawal.member_id, withdrawal.amount, withdrawalType)}
                                 disabled={!hasSufficientBalance}
                               >
                                 <CheckCircle className="h-4 w-4 mr-1" />
                                 Approve
                               </Button>
                             )}
                             {withdrawal.status === 'approved' && (
                               <Button
                                 size="sm"
                                 variant="default"
                                 onClick={() => completeWithdrawal(withdrawal.id, withdrawal.member_id)}
                               >
                                 <CheckCircle className="h-4 w-4 mr-1" />
                                 Mark as Paid
                               </Button>
                             )}
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

export default Withdrawals;
