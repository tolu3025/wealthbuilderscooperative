import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, DollarSign, Download, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

interface ProjectSupportContribution {
  id: string;
  member_id: string;
  amount: number;
  contribution_month: string;
  payment_status: string;
  receipt_url: string | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    member_number: string;
    phone: string;
  };
}

const ProjectSupportFund = () => {
  const [contributions, setContributions] = useState<ProjectSupportContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjectSupportContributions();
  }, []);

  const fetchProjectSupportContributions = async () => {
    try {
      const { data, error } = await supabase
        .from('project_support_contributions')
        .select(`
          id,
          member_id,
          amount,
          contribution_month,
          payment_status,
          receipt_url,
          created_at,
          approved_at,
          approved_by,
          profiles:member_id (
            first_name,
            last_name,
            member_number,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setContributions(data as any || []);

      // Calculate stats
      const total = data?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
      const pending = data?.filter(c => c.payment_status === 'pending').length || 0;
      const approved = data?.filter(c => c.payment_status === 'approved').length || 0;

      setTotalAmount(total);
      setPendingCount(pending);
      setApprovedCount(approved);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approveContribution = async (contributionId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get the admin's profile ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile) throw new Error('Admin profile not found');

      const { error } = await supabase
        .from('project_support_contributions')
        .update({ 
          payment_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: profile.id
        })
        .eq('id', contributionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project support contribution approved successfully",
      });

      fetchProjectSupportContributions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadReceipt = async (receiptUrl: string) => {
    try {
      // Extract the file path from the full URL
      const urlParts = receiptUrl.split('/storage/v1/object/public/payment-receipts/');
      if (urlParts.length < 2) {
        throw new Error('Invalid receipt URL');
      }
      const filePath = urlParts[1];

      // Download the file using Supabase client
      const { data, error } = await supabase.storage
        .from('payment-receipts')
        .download(filePath);

      if (error) throw error;

      // Create a temporary URL and trigger download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'receipt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Receipt downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error downloading receipt",
        description: error.message,
        variant: "destructive",
      });
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
          <main className="flex-1 p-6 overflow-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Project Support Fund Management</h1>
              <p className="text-muted-foreground">
                Monitor and approve mandatory ₦500 project support fund contributions
              </p>
              <Alert className="mt-3 border-red-500/50 bg-red-50 dark:bg-red-950/20">
                <AlertDescription className="text-sm text-red-900 dark:text-red-100">
                  <strong className="text-red-700 dark:text-red-300">⚠️ MANDATORY Payment:</strong> Members must pay by the last Thursday of each month to receive Real Estate Bonus earnings for that month.
                </AlertDescription>
              </Alert>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Collected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    ₦{totalAmount.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-amber-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pending Approval
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {pendingCount}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Approved
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {approvedCount}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contributions Table */}
            <Card>
              <CardHeader>
                <CardTitle>Mandatory Project Support Fund Contributions</CardTitle>
                <CardDescription>
                  All mandatory ₦500 monthly payments - members must pay by last Thursday to receive Real Estate Bonus
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contributions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No project support contributions yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Member #</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Month</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Receipt</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contributions.map((contribution) => (
                          <TableRow key={contribution.id}>
                            <TableCell>
                              {contribution.profiles.first_name} {contribution.profiles.last_name}
                            </TableCell>
                            <TableCell>{contribution.profiles.member_number || 'N/A'}</TableCell>
                            <TableCell>{contribution.profiles.phone || 'N/A'}</TableCell>
                            <TableCell className="font-semibold">
                              ₦{Number(contribution.amount).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {contribution.contribution_month 
                                ? new Date(contribution.contribution_month).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'short' 
                                  })
                                : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {new Date(contribution.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {contribution.receipt_url ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadReceipt(contribution.receipt_url!)}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              ) : (
                                <Badge variant="secondary">No Receipt</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {contribution.payment_status === 'approved' ? (
                                <Badge variant="default">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approved
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {contribution.payment_status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => approveContribution(contribution.id)}
                                >
                                  Approve
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

export default ProjectSupportFund;
