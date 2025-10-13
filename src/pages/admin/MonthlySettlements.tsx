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

  const generateBroadSheet = (settlement: Settlement) => {
    // TODO: Generate PDF/Excel report
    toast.info("Report generation coming soon");
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
                        <TableHead>Status</TableHead>
                        <TableHead>Settled Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlements.map((settlement) => (
                        <TableRow key={settlement.id}>
                          <TableCell className="font-medium">
                            {format(new Date(settlement.settlement_month + '-01'), 'MMMM yyyy')}
                          </TableCell>
                          <TableCell>{settlement.total_registrations}</TableCell>
                          <TableCell className="font-semibold">
                            ₦{settlement.total_allocated.toLocaleString()}
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
                                      This will mark all financial records for {format(new Date(settlement.settlement_month + '-01'), 'MMMM yyyy')} as settled and locked. 
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

export default MonthlySettlements;
