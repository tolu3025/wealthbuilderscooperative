import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Settlement {
  id: string;
  settlement_month: string;
  total_registrations: number;
  total_contributions: number;
  total_allocated: number;
  total_withdrawals: number;
  status: string;
  broad_sheet_data: any;
  settled_at: string | null;
}

const MonthlySettlements = () => {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettlements();
  }, []);

  const fetchSettlements = async () => {
    try {
      const { data, error } = await supabase
        .from('monthly_settlements')
        .select('*')
        .order('settlement_month', { ascending: false });

      if (error) throw error;
      setSettlements(data || []);
    } catch (error: any) {
      toast.error("Failed to load settlements: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const settleMonth = async (settlementId: string, month: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Mark settlement as settled
      const { error: settlementError } = await supabase
        .from('monthly_settlements')
        .update({
          status: 'settled',
          settled_by: user.id,
          settled_at: new Date().toISOString(),
        })
        .eq('id', settlementId);

      if (settlementError) throw settlementError;

      // Mark all financial allocations for this month as settled
      const { error: allocError } = await supabase
        .from('financial_allocations')
        .update({
          status: 'settled',
          settled_at: new Date().toISOString(),
          settled_by: user.id,
        })
        .eq('settlement_month', month)
        .eq('status', 'pending');

      if (allocError) throw allocError;

      // Mark all contributions for this month as settled
      const { error: contribError } = await supabase
        .from('contributions')
        .update({ settlement_status: 'settled' })
        .eq('settlement_month', month)
        .eq('settlement_status', 'pending');

      if (contribError) throw contribError;

      // Mark all commissions for this month as settled (approved)
      const { error: commError } = await supabase
        .from('commissions')
        .update({ status: 'approved' })
        .gte('created_at', month + '-01')
        .lt('created_at', format(new Date(new Date(month + '-01').setMonth(new Date(month + '-01').getMonth() + 1)), 'yyyy-MM-dd'))
        .eq('status', 'pending');

      if (commError) throw commError;

      // Mark all withdrawals for this month as completed
      const { error: withdrawError } = await supabase
        .from('withdrawal_requests')
        .update({ 
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .gte('requested_at', month + '-01')
        .lt('requested_at', format(new Date(new Date(month + '-01').setMonth(new Date(month + '-01').getMonth() + 1)), 'yyyy-MM-dd'))
        .eq('status', 'approved');

      if (withdrawError) throw withdrawError;

      toast.success(`${format(new Date(month + '-01'), 'MMMM yyyy')} has been settled - all records finalized`);
      fetchSettlements();
    } catch (error: any) {
      toast.error("Failed to settle month: " + error.message);
    }
  };

  const generateAllReports = async () => {
    try {
      // Fetch all settlement data with better error handling
      const allReportsData = await Promise.all(
        settlements.map(async (settlement) => {
          try {
            // Validate settlement month exists
            if (!settlement.settlement_month) {
              console.error('Settlement missing month:', settlement.id);
              return null;
            }

            const monthDate = new Date(settlement.settlement_month + '-01');
            if (isNaN(monthDate.getTime())) {
              console.error('Invalid settlement month:', settlement.settlement_month);
              return null;
            }

            const nextMonth = new Date(monthDate);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            const nextMonthStr = format(nextMonth, 'yyyy-MM-dd');

            const { data: allocations } = await supabase
              .from('financial_allocations')
              .select('*')
              .eq('settlement_month', settlement.settlement_month);

            const { data: commissions } = await supabase
              .from('commissions')
              .select('*, profiles!commissions_member_id_fkey(first_name, last_name, member_number)')
              .gte('created_at', settlement.settlement_month + '-01')
              .lt('created_at', nextMonthStr);

            const { data: withdrawals } = await supabase
              .from('withdrawal_requests')
              .select('*, profiles!withdrawal_requests_member_id_fkey(first_name, last_name, member_number, phone)')
              .gte('requested_at', settlement.settlement_month + '-01')
              .lt('requested_at', nextMonthStr)
              .in('status', ['approved', 'completed']);

            return {
              settlement,
              allocations: allocations || [],
              commissions: commissions || [],
              withdrawals: withdrawals || [],
              monthDisplay: format(monthDate, 'MMMM yyyy')
            };
          } catch (error) {
            console.error('Error processing settlement:', settlement.id, error);
            return null;
          }
        })
      );

      // Filter out failed settlements
      const validReports = allReportsData.filter(report => report !== null);

      if (validReports.length === 0) {
        toast.error("No settlement records found. Please ensure settlements exist before generating reports.");
        return;
      }

      // Create comprehensive HTML report
      const content = `
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #0052CC; page-break-before: always; }
            h1:first-child { page-break-before: avoid; }
            h2 { color: #00C49A; margin-top: 30px; }
            h3 { color: #666; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #0052CC; color: white; }
            .summary-box { background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .total-row { font-weight: bold; background-color: #e8f4f8; }
            @media print {
              h1 { page-break-before: always; }
              h1:first-child { page-break-before: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>WealthBuilders Cooperative</h1>
          <h2>Complete Monthly Settlements Report</h2>
          <p>Generated on: ${format(new Date(), 'PPP')}</p>

          ${validReports.map(({ settlement, allocations, commissions, withdrawals, monthDisplay }) => `
            <h1>${monthDisplay} Settlement Report</h1>
            
            <div class="summary-box">
              <h3>Summary</h3>
              <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>Total Registrations</td><td>${settlement.total_registrations}</td></tr>
                <tr><td>Total Contributions</td><td>₦${Number(settlement.total_contributions || 0).toLocaleString()}</td></tr>
                <tr><td>Total Allocated</td><td>₦${Number(settlement.total_allocated || 0).toLocaleString()}</td></tr>
                <tr><td>Total Withdrawals</td><td>₦${Number(settlement.total_withdrawals || 0).toLocaleString()}</td></tr>
                <tr><td>Status</td><td>${settlement.status}</td></tr>
              </table>
            </div>

            <h3>Financial Allocations</h3>
            <table>
              <tr><th>Type</th><th>Amount</th><th>Status</th></tr>
              ${allocations?.map(a => `
                <tr>
                  <td>${a.allocation_type.replace('_', ' ').toUpperCase()}</td>
                  <td>₦${Number(a.amount).toLocaleString()}</td>
                  <td>${a.status}</td>
                </tr>
              `).join('') || '<tr><td colspan="3">No allocations</td></tr>'}
              <tr class="total-row">
                <td>TOTAL</td>
                <td>₦${(allocations?.reduce((sum, a) => sum + Number(a.amount), 0) || 0).toLocaleString()}</td>
                <td></td>
              </tr>
            </table>

            <h3>Commissions</h3>
            <table>
              <tr><th>Member</th><th>Member Number</th><th>Type</th><th>Amount</th><th>Status</th></tr>
              ${commissions?.map(c => `
                <tr>
                  <td>${c.profiles?.first_name} ${c.profiles?.last_name}</td>
                  <td>${c.profiles?.member_number}</td>
                  <td>${c.commission_type}</td>
                  <td>₦${Number(c.amount).toLocaleString()}</td>
                  <td>${c.status}</td>
                </tr>
              `).join('') || '<tr><td colspan="5">No commissions</td></tr>'}
              <tr class="total-row">
                <td colspan="3">TOTAL</td>
                <td>₦${(commissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0).toLocaleString()}</td>
                <td></td>
              </tr>
            </table>

            <h3>Withdrawals</h3>
            <table>
              <tr><th>Member</th><th>Member Number</th><th>Account Number</th><th>Bank Name</th><th>Amount</th><th>Status</th></tr>
              ${withdrawals?.map(w => `
                 <tr>
                   <td>${w.profiles?.first_name} ${w.profiles?.last_name}</td>
                   <td>${w.profiles?.member_number}</td>
                   <td>${w.account_number || 'N/A'}</td>
                   <td>${w.bank_name || 'N/A'}</td>
                   <td>₦${Number(w.amount).toLocaleString()}</td>
                   <td>${w.status}</td>
                 </tr>
               `).join('') || '<tr><td colspan="6">No withdrawals</td></tr>'}
              <tr class="total-row">
                <td colspan="4">TOTAL</td>
                <td>₦${(withdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0).toLocaleString()}</td>
                <td></td>
              </tr>
            </table>
          `).join('')}
        </body>
        </html>
      `;

      // Create blob and download
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wealthbuilders-settlements-${format(new Date(), 'yyyy-MM-dd')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Complete settlements report downloaded");
    } catch (error: any) {
      toast.error("Failed to generate report: " + error.message);
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
          <main className="flex-1 p-6 space-y-6 overflow-auto">
            <div>
              <h1 className="text-3xl font-bold mb-2">Monthly Settlements</h1>
              <p className="text-muted-foreground">
                Review and settle monthly financial records
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Settlement History</CardTitle>
                <CardDescription>
                  Mark months as settled to lock financial records
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={generateAllReports}
                  variant="outline"
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download Complete Settlements Report
                </Button>
                {settlements.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No settlements found
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Registrations</TableHead>
                        <TableHead>Total Allocated</TableHead>
                        <TableHead>Withdrawals</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Settled Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlements.map((settlement) => {
                        const monthDate = settlement.settlement_month 
                          ? new Date(settlement.settlement_month + '-01')
                          : null;
                        const isValidMonthDate = monthDate && !isNaN(monthDate.getTime());

                        return (
                          <TableRow key={settlement.id}>
                            <TableCell className="font-medium">
                              {isValidMonthDate ? format(monthDate, 'MMMM yyyy') : settlement.settlement_month || 'Invalid date'}
                            </TableCell>
                            <TableCell>{settlement.total_registrations}</TableCell>
                            <TableCell className="font-semibold">
                              ₦{settlement.total_allocated.toLocaleString()}
                            </TableCell>
                            <TableCell className="font-semibold text-red-600">
                              ₦{(settlement.total_withdrawals || 0).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={settlement.status === 'settled' ? 'default' : 'secondary'}>
                                {settlement.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {settlement.settled_at 
                                ? format(new Date(settlement.settled_at), 'MMM dd, yyyy')
                                : 'Not settled'
                              }
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {settlement.status === 'pending' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Settle
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                   <AlertDialogHeader>
                                    <AlertDialogTitle>Settle This Month?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will mark all financial records for {isValidMonthDate ? format(monthDate, 'MMMM yyyy') : settlement.settlement_month} as settled and locked. 
                                      All pending commissions will be approved. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => settleMonth(settlement.id, settlement.settlement_month)}
                                    >
                                      Settle Month
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </TableCell>
                        </TableRow>
                        );
                      })}
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

export default MonthlySettlements;
