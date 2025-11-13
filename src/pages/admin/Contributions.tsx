import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Download, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Contributions = () => {
  const [pendingContribs, setPendingContribs] = useState<any[]>([]);
  const [pendingProjectSupport, setPendingProjectSupport] = useState<any[]>([]);
  const [selectedProjectSupport, setSelectedProjectSupport] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingContributions();
    fetchPendingProjectSupport();
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

  const fetchPendingProjectSupport = async () => {
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
          profiles:member_id (
            first_name,
            last_name,
            member_number,
            phone
          )
        `)
        .eq('payment_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingProjectSupport(data || []);
    } catch (error: any) {
      console.error('Error fetching project support:', error);
      toast.error(error.message);
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

  const toggleProjectSupportSelection = (id: string) => {
    const newSelection = new Set(selectedProjectSupport);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedProjectSupport(newSelection);
  };

  const approveSelectedProjectSupport = async () => {
    if (selectedProjectSupport.size === 0) {
      toast.error("Please select at least one contribution to approve");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get admin profile ID
      const { data: adminProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!adminProfile) throw new Error('Admin profile not found');

      // Approve each selected contribution
      for (const contributionId of selectedProjectSupport) {
        const { error: updateError } = await supabase
          .from('project_support_contributions')
          .update({
            payment_status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: adminProfile.id
          })
          .eq('id', contributionId);

        if (updateError) throw updateError;
      }

      toast.success(`${selectedProjectSupport.size} project support contribution(s) approved`);
      setSelectedProjectSupport(new Set());
      await fetchPendingProjectSupport();
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
                Review and approve member contributions and project support fund payments
              </p>
            </div>

            <Tabs defaultValue="contributions" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="contributions">
                  Monthly Contributions ({pendingContribs.length})
                </TabsTrigger>
                <TabsTrigger value="project-support">
                  Project Support Fund ({pendingProjectSupport.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="contributions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Monthly Contributions</CardTitle>
                  <CardDescription>
                    Verify payment receipts and approve member monthly contributions
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
                            <TableCell>
                              {contrib.project_support_amount > 0 ? (
                                <span className="text-orange-600 font-medium">
                                  ₦{Number(contrib.project_support_amount).toLocaleString()}
                                </span>
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
              </TabsContent>

              <TabsContent value="project-support" className="mt-6">
                <Alert className="mb-4 border-red-500/50 bg-red-50 dark:bg-red-950/20">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-sm text-red-900 dark:text-red-100">
                    <strong>⚠️ MANDATORY Payment:</strong> Members must pay ₦500 by the last Thursday of each month to receive Real Estate Bonus earnings.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle>Pending Project Support Fund Payments</CardTitle>
                    <CardDescription>
                      Select and approve mandatory ₦500 monthly project support fund payments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pendingProjectSupport.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No pending project support payments</p>
                    ) : (
                      <>
                        <div className="mb-4 flex justify-between items-center">
                          <p className="text-sm text-muted-foreground">
                            {selectedProjectSupport.size} of {pendingProjectSupport.length} selected
                          </p>
                          <Button
                            onClick={approveSelectedProjectSupport}
                            disabled={selectedProjectSupport.size === 0}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve Selected ({selectedProjectSupport.size})
                          </Button>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">Select</TableHead>
                                <TableHead>Member</TableHead>
                                <TableHead>Member #</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Month</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Receipt</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pendingProjectSupport.map((contribution: any) => (
                                <TableRow key={contribution.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedProjectSupport.has(contribution.id)}
                                      onCheckedChange={() => toggleProjectSupportSelection(contribution.id)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {contribution.profiles.first_name} {contribution.profiles.last_name}
                                  </TableCell>
                                  <TableCell>{contribution.profiles.member_number || 'N/A'}</TableCell>
                                  <TableCell className="font-semibold text-primary">
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
                                        onClick={() => downloadReceipt(contribution.receipt_url)}
                                      >
                                        <Download className="h-4 w-4 mr-1" />
                                        View
                                      </Button>
                                    ) : (
                                      <Badge variant="secondary">No Receipt</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Contributions;
