import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Eye, Calendar, User, FileText, Download } from "lucide-react";
import { AdminRoute } from "@/components/AdminRoute";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface UpgradeRequest {
  id: string;
  member_id: string;
  breakdown_type: string;
  receipt_url: string;
  status: string;
  requested_at: string;
  decline_reason: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    member_number: string;
  };
}

const AccountUpgrades = () => {
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<UpgradeRequest | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('member_upgrade_requests')
        .select(`
          id,
          member_id,
          breakdown_type,
          receipt_url,
          status,
          requested_at,
          decline_reason,
          profiles!member_upgrade_requests_member_id_fkey (
            first_name,
            last_name,
            email,
            phone,
            member_number
          )
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
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

  const handleApprove = async (request: UpgradeRequest) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get admin's profile ID
      const { data: adminProfile, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (adminError) throw adminError;

      // Update member profile to contributor
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          member_type: 'contributor',
          breakdown_type: request.breakdown_type,
        })
        .eq('id', request.member_id);

      if (updateError) throw updateError;

      // Create first contribution record
      const capitalAmount = request.breakdown_type === '80_20' ? 4000 : 5000;
      const savingsAmount = request.breakdown_type === '80_20' ? 1000 : 0;

      const { error: contribError } = await supabase
        .from('contributions')
        .insert({
          member_id: request.member_id,
          amount: 5500,
          capital_amount: capitalAmount,
          savings_amount: savingsAmount,
          project_support_amount: 500,
          payment_status: 'pending',
          receipt_url: request.receipt_url,
          payment_date: new Date().toISOString(),
          contribution_month: new Date().toISOString(),
        });

      if (contribError) throw contribError;

      // Update request status
      const { error: requestError } = await supabase
        .from('member_upgrade_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminProfile.id,
        })
        .eq('id', request.id);

      if (requestError) throw requestError;

      toast({
        title: "Upgrade Approved",
        description: "Member account has been upgraded to Contributor",
      });

      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedRequest || !declineReason.trim()) {
      toast({
        title: "Decline Reason Required",
        description: "Please provide a reason for declining",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: adminProfile, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (adminError) throw adminError;

      const { error } = await supabase
        .from('member_upgrade_requests')
        .update({
          status: 'declined',
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminProfile.id,
          decline_reason: declineReason,
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Request Declined",
        description: "Member has been notified",
      });

      setShowDeclineDialog(false);
      setDeclineReason("");
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const downloadReceipt = async (receiptUrl: string) => {
    try {
      const fileName = receiptUrl.split('/').pop() || 'receipt';
      const { data, error } = await supabase.storage
        .from('payment-receipts')
        .download(receiptUrl);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "Receipt is being downloaded",
      });
    } catch (error: any) {
      console.error('Receipt download error:', error);
      toast({
        title: "Download Failed",
        description: error?.message || "Unable to download receipt. Please check if the file exists.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Approved</Badge>;
      case 'declined':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderRequestCard = (request: UpgradeRequest) => (
    <Card key={request.id} className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {request.profiles.first_name} {request.profiles.last_name}
            </CardTitle>
            <CardDescription className="mt-1">
              Member #{request.profiles.member_number} • {request.profiles.email}
            </CardDescription>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p className="font-medium">{request.profiles.phone}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Breakdown Type</p>
            <p className="font-medium">
              {request.breakdown_type === '80_20' ? '80/20 Split' : '100% Capital'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Requested At</p>
            <p className="font-medium flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(request.requested_at).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Receipt</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadReceipt(request.receipt_url)}
              className="mt-1"
            >
              <Download className="h-4 w-4 mr-2" />
              View Receipt
            </Button>
          </div>
        </div>

        {request.status === 'pending' && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => handleApprove(request)}
              disabled={processing}
              className="flex-1"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve Upgrade
            </Button>
            <Button
              onClick={() => {
                setSelectedRequest(request);
                setShowDeclineDialog(true);
              }}
              disabled={processing}
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Decline
            </Button>
          </div>
        )}

        {request.status === 'declined' && request.decline_reason && (
          <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200">
            <p className="text-sm font-medium text-red-900 dark:text-red-100">Decline Reason:</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{request.decline_reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const declinedRequests = requests.filter(r => r.status === 'declined');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminRoute>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AdminSidebar />
          <div className="flex-1">
            <DashboardHeader />
            <main className="container mx-auto p-6">
              <div className="mb-6">
                <h1 className="text-3xl font-bold">Account Upgrade Requests</h1>
                <p className="text-muted-foreground mt-1">
                  Review and approve member upgrade requests from Acting Member to Contributor
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Pending Requests</CardDescription>
                    <CardTitle className="text-3xl">{pendingRequests.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Approved</CardDescription>
                    <CardTitle className="text-3xl text-green-600">{approvedRequests.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Declined</CardDescription>
                    <CardTitle className="text-3xl text-red-600">{declinedRequests.length}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="pending">
                    Pending ({pendingRequests.length})
                  </TabsTrigger>
                  <TabsTrigger value="approved">
                    Approved ({approvedRequests.length})
                  </TabsTrigger>
                  <TabsTrigger value="declined">
                    Declined ({declinedRequests.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-6">
                  {pendingRequests.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6 text-center text-muted-foreground">
                        No pending upgrade requests
                      </CardContent>
                    </Card>
                  ) : (
                    pendingRequests.map(renderRequestCard)
                  )}
                </TabsContent>

                <TabsContent value="approved" className="mt-6">
                  {approvedRequests.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6 text-center text-muted-foreground">
                        No approved requests yet
                      </CardContent>
                    </Card>
                  ) : (
                    approvedRequests.map(renderRequestCard)
                  )}
                </TabsContent>

                <TabsContent value="declined" className="mt-6">
                  {declinedRequests.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6 text-center text-muted-foreground">
                        No declined requests
                      </CardContent>
                    </Card>
                  ) : (
                    declinedRequests.map(renderRequestCard)
                  )}
                </TabsContent>
              </Tabs>

              <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Decline Upgrade Request</DialogTitle>
                    <DialogDescription>
                      Please provide a reason for declining this upgrade request
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="reason">Decline Reason</Label>
                      <Textarea
                        id="reason"
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        placeholder="e.g., Receipt is unclear, payment details don't match..."
                        rows={4}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeclineDialog(false);
                        setDeclineReason("");
                        setSelectedRequest(null);
                      }}
                      disabled={processing}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDecline}
                      disabled={processing || !declineReason.trim()}
                    >
                      {processing ? "Processing..." : "Decline Request"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AdminRoute>
  );
};

export default AccountUpgrades;
