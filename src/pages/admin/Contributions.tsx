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

  const approveContribution = async (contributionId: string) => {
    try {
      const { error } = await supabase
        .from('contributions')
        .update({
          payment_status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', contributionId);

      if (error) throw error;
      
      toast.success("Contribution approved successfully");
      fetchPendingContributions();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const downloadReceipt = (receiptUrl: string) => {
    window.open(receiptUrl, '_blank');
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader userName="Admin" />
          <main className="flex-1 p-6 space-y-6">
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
                  <p className="text-center text-muted-foreground py-8">No pending contributions</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Capital</TableHead>
                        <TableHead>Savings</TableHead>
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
                          <TableCell>₦{Number(contrib.capital_amount).toLocaleString()}</TableCell>
                          <TableCell>₦{Number(contrib.savings_amount).toLocaleString()}</TableCell>
                          <TableCell>
                            {contrib.receipt_url ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => downloadReceipt(contrib.receipt_url)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            ) : (
                              <Badge variant="secondary">No receipt</Badge>
                            )}
                          </TableCell>
                          <TableCell>{new Date(contrib.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => approveContribution(contrib.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
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

export default Contributions;
