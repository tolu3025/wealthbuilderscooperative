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

      // Mark all commissions for this month as settled (approved)
      const { error: commError } = await supabase
        .from('commissions')
        .update({ status: 'approved' })
        .gte('created_at', month + '-01')
        .lt('created_at', format(new Date(new Date(month + '-01').setMonth(new Date(month + '-01').getMonth() + 1)), 'yyyy-MM-dd'))
        .eq('status', 'pending');

      if (commError) throw commError;

      toast.success(`${format(new Date(month + '-01'), 'MMMM yyyy')} has been settled`);
      fetchSettlements();
    } catch (error: any) {
      toast.error("Failed to settle month: " + error.message);
    }
  };

  const generateBroadSheet = async (settlement: Settlement) => {
    try {
      // Fetch detailed data for the settlement
      const { data: allocations } = await supabase
        .from('financial_allocations')
        .select('*')
        .eq('settlement_month', settlement.settlement_month);

      const { data: commissions } = await supabase
        .from('commissions')
        .select('*, profiles!commissions_member_id_fkey(first_name, last_name, member_number)')
        .gte('created_at', settlement.settlement_month + '-01')
        .lt('created_at', format(new Date(new Date(settlement.settlement_month + '-01').setMonth(new Date(settlement.settlement_month + '-01').getMonth() + 1)), 'yyyy-MM-dd'));

      // Create PDF content
      const content = `
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #0052CC; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #0052CC; color: white; }
            .total { font-weight: bold; background-color: #f0f0f0; }
          </style>
        </head>
        <body>
          <h1>Monthly Settlement Report</h1>
          <h2>${format(new Date(settlement.settlement_month + '-01'), 'MMMM yyyy')}</h2>
          
          <h3>Summary</h3>
          <table>
            <tr><th>Registrations</th><td>${settlement.total_registrations}</td></tr>
            <tr><th>Total Contributions</th><td>₦${settlement.total_contributions.toLocaleString()}</td></tr>
            <tr><th>Total Allocated</th><td>₦${settlement.total_allocated.toLocaleString()}</td></tr>
            <tr><th>Status</th><td>${settlement.status}</td></tr>
          </table>

          <h3>Financial Allocations</h3>
          <table>
            <tr><th>Type</th><th>Amount</th></tr>
            ${allocations?.map(a => `<tr><td>${a.allocation_type}</td><td>₦${Number(a.amount).toLocaleString()}</td></tr>`).join('')}
          </table>

          <h3>Commissions</h3>
          <table>
            <tr><th>Member</th><th>Type</th><th>Amount</th><th>Status</th></tr>
            ${commissions?.map(c => `
              <tr>
                <td>${c.profiles?.first_name} ${c.profiles?.last_name} (${c.profiles?.member_number})</td>
                <td>${c.commission_type}</td>
                <td>₦${Number(c.amount).toLocaleString()}</td>
                <td>${c.status}</td>
              </tr>
            `).join('')}
          </table>
        </body>
        </html>
      `;

      // Create blob and download
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settlement-${settlement.settlement_month}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Settlement report downloaded");
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
              <CardContent>
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateBroadSheet(settlement)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Report
                            </Button>
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
