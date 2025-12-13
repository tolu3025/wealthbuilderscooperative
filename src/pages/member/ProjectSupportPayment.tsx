import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/FileUpload";
import { CopyPhoneButton } from "@/components/CopyPhoneButton";
import { DashboardHeader } from "@/components/DashboardHeader";
import { MemberSidebar } from "@/components/MemberSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Wallet, Info, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";

const ProjectSupportPayment = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projectSupportReceipt, setProjectSupportReceipt] = useState<string>("");
  const [psfSubmitted, setPsfSubmitted] = useState(false);
  const [psfHistory, setPsfHistory] = useState<any[]>([]);
  const { toast } = useToast();

  // Calculate last Thursday of current month
  const getLastThursday = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const dayOfWeek = lastDay.getDay();
    const daysUntilThursday = (dayOfWeek >= 4) ? (dayOfWeek - 4) : (dayOfWeek + 3);
    const lastThursday = new Date(lastDay);
    lastThursday.setDate(lastDay.getDate() - daysUntilThursday);
    return lastThursday;
  };

  const lastThursday = getLastThursday();
  const lastThursdayFormatted = lastThursday.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);

        // Check if PSF already submitted for current month
        const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7) + '-01';
        const { data: psfData } = await supabase
          .from('project_support_contributions')
          .select('id')
          .eq('member_id', profileData.id)
          .eq('contribution_month', currentMonth)
          .limit(1);
        
        if (psfData && psfData.length > 0) {
          setPsfSubmitted(true);
        }

        // Fetch PSF history
        const { data: historyData } = await supabase
          .from('project_support_contributions')
          .select('*')
          .eq('member_id', profileData.id)
          .order('created_at', { ascending: false })
          .limit(12);

        setPsfHistory(historyData || []);
      }
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSupportSubmit = async () => {
    if (!profile || !projectSupportReceipt) {
      toast({
        title: "Missing Information",
        description: "Please upload a receipt for the project support fund",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7) + '-01';
      
      const { error } = await supabase
        .from('project_support_contributions')
        .insert({
          member_id: profile.id,
          amount: 500,
          contribution_month: currentMonth,
          receipt_url: projectSupportReceipt,
          payment_status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Project Support Submitted!",
        description: "Your ₦500 project support fund receipt has been submitted for approval.",
      });

      setProjectSupportReceipt("");
      setPsfSubmitted(true);
      fetchData();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit project support",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'declined':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <MemberSidebar />
          <div className="flex-1 flex flex-col">
            <DashboardHeader userName="" avatarUrl="" />
            <div className="flex-1 flex items-center justify-center bg-muted/30">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <MemberSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader userName={profile ? `${profile.first_name} ${profile.last_name}` : ""} avatarUrl={profile?.avatar_url || ""} />
          <main className="flex-1 p-4 md:p-6 bg-muted/30 overflow-auto">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Header */}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-red-600">Project Support Fund</h1>
                <p className="text-muted-foreground mt-1">Mandatory monthly payment of ₦500</p>
              </div>

              {/* Status Banner */}
              {psfSubmitted ? (
                <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-900 dark:text-green-100">
                    <strong>✓ Submitted for this month!</strong>
                    <p className="text-sm mt-1">Your receipt is pending admin approval. You'll be notified once reviewed.</p>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-red-500/50 bg-red-50 dark:bg-red-950/20">
                  <Info className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-900 dark:text-red-100">
                    <strong className="text-red-700 dark:text-red-300">⚠️ Payment Required</strong>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>The ₦500 Project Support Fund is <strong>compulsory</strong> for all members.</p>
                      <p className="font-semibold">⏰ Deadline: {lastThursdayFormatted}</p>
                      <p className="text-red-700 dark:text-red-300">
                        ⚠️ Late payment = No Real Estate Bonus for this month.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Payment Card */}
              <Card className="border-2 border-red-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-red-600" />
                    Pay ₦500 Project Support
                  </CardTitle>
                  <CardDescription>
                    Transfer to the account below, then upload your receipt
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Bank Details */}
                  <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg space-y-3 border border-red-200 dark:border-red-800">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Bank Name</p>
                      <p className="font-semibold text-lg">Alpha Morgan Bank</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Account Number</p>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-2xl">2010006769</p>
                        <CopyPhoneButton phoneNumber="2010006769" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Account Name</p>
                      <p className="font-semibold text-sm">WEALTH BUILDERS IN PROPERTIES MULTIPURPOSE COOPERATIVE LTD</p>
                    </div>
                    <div className="pt-2 border-t border-red-200 dark:border-red-700">
                      <p className="text-sm text-muted-foreground mb-1">Amount</p>
                      <p className="font-bold text-3xl text-red-600">₦500</p>
                    </div>
                  </div>

                  {/* Upload Section */}
                  {!psfSubmitted && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Upload Payment Receipt *</label>
                        <FileUpload
                          onUploadComplete={setProjectSupportReceipt}
                          userId={user?.id || ""}
                          fileType="project-support"
                          bucket="payment-receipts"
                        />
                        {projectSupportReceipt && (
                          <p className="text-sm text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" /> Receipt uploaded successfully
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={handleProjectSupportSubmit}
                        disabled={!projectSupportReceipt || submitting}
                        className="w-full bg-red-600 hover:bg-red-700 text-lg py-6"
                        size="lg"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            Submitting...
                          </>
                        ) : (
                          "Submit Payment Receipt"
                        )}
                      </Button>
                    </>
                  )}

                  {psfSubmitted && (
                    <div className="text-center py-4">
                      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
                      <p className="text-lg font-semibold text-green-600">Payment Submitted!</p>
                      <p className="text-sm text-muted-foreground">Awaiting admin approval</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment History */}
              {psfHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>Your past project support fund payments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Month</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {psfHistory.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              {new Date(payment.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {payment.contribution_month ? 
                                new Date(payment.contribution_month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                                : 'N/A'}
                            </TableCell>
                            <TableCell className="font-semibold">₦{payment.amount}</TableCell>
                            <TableCell>{getStatusBadge(payment.payment_status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default ProjectSupportPayment;
