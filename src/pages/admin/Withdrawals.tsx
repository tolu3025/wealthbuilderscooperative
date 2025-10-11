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
        .eq('status', 'pending')
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

  const approveWithdrawal = async (withdrawalId: string) => {
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawalId);

      if (error) throw error;
      
      toast.success("Withdrawal approved successfully");
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
                <CardTitle>Pending Withdrawals ({pendingWithdrawals.length})</CardTitle>
                <CardDescription>
                  Approve withdrawals and process payments
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
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => approveWithdrawal(withdrawal.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve & Process
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

export default Withdrawals;
