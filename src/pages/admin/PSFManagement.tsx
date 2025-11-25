import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Check, X, Eye, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

interface PSFContribution {
  id: string;
  member_id: string;
  amount: number;
  contribution_month: string;
  payment_status: string;
  receipt_url: string | null;
  created_at: string;
  member_name: string;
  member_number: string;
  member_email: string;
}

export default function PSFManagement() {
  const [loading, setLoading] = useState(true);
  const [pendingPSF, setPendingPSF] = useState<PSFContribution[]>([]);
  const [approvedPSF, setApprovedPSF] = useState<PSFContribution[]>([]);
  const [declinedPSF, setDeclinedPSF] = useState<PSFContribution[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPSFContributions();
  }, []);

  const fetchPSFContributions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("project_support_contributions")
        .select(`
          *,
          profiles!project_support_contributions_member_id_fkey (
            first_name,
            last_name,
            member_number,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        id: item.id,
        member_id: item.member_id,
        amount: item.amount,
        contribution_month: item.contribution_month,
        payment_status: item.payment_status,
        receipt_url: item.receipt_url,
        created_at: item.created_at,
        member_name: `${item.profiles?.first_name || ""} ${item.profiles?.last_name || ""}`.trim(),
        member_number: item.profiles?.member_number || "N/A",
        member_email: item.profiles?.email || "",
      }));

      setPendingPSF(formatted.filter((p) => p.payment_status === "pending" && p.receipt_url));
      setApprovedPSF(formatted.filter((p) => p.payment_status === "approved"));
      setDeclinedPSF(formatted.filter((p) => p.payment_status === "declined"));
    } catch (error: any) {
      console.error("Error fetching PSF contributions:", error);
      toast.error("Failed to load PSF contributions");
    } finally {
      setLoading(false);
    }
  };

  const createNotification = async (userId: string, title: string, message: string, type: string, relatedId: string) => {
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: userId,
        title,
        message,
        type,
        related_id: relatedId,
        read: false,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Error creating notification:", error);
    }
  };

  const approvePSF = async (psfId: string, memberName: string) => {
    setProcessingId(psfId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) throw new Error("Admin profile not found");

      // Get PSF details to find member's user_id
      const { data: psfData } = await supabase
        .from("project_support_contributions")
        .select("member_id, profiles!project_support_contributions_member_id_fkey(user_id)")
        .eq("id", psfId)
        .single();

      // Approve PSF
      const { error: approveError } = await supabase
        .from("project_support_contributions")
        .update({
          payment_status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: profile.id,
        })
        .eq("id", psfId);

      if (approveError) throw approveError;

      // Create notification for member
      if (psfData?.profiles?.user_id) {
        await createNotification(
          psfData.profiles.user_id,
          "PSF Payment Approved ✅",
          `Your Project Support Fund payment of ₦500 has been approved and credited to your account.`,
          "psf_approved",
          psfId
        );
      }

      toast.success(`PSF payment for ${memberName} approved successfully`);
      fetchPSFContributions();
    } catch (error: any) {
      console.error("Error approving PSF:", error);
      toast.error(error.message || "Failed to approve PSF");
    } finally {
      setProcessingId(null);
    }
  };

  const declinePSF = async (psfId: string, memberName: string) => {
    setProcessingId(psfId);
    try {
      // Get PSF details to find member's user_id
      const { data: psfData } = await supabase
        .from("project_support_contributions")
        .select("member_id, profiles!project_support_contributions_member_id_fkey(user_id)")
        .eq("id", psfId)
        .single();

      // Decline PSF
      const { error: declineError } = await supabase
        .from("project_support_contributions")
        .update({ payment_status: "declined" })
        .eq("id", psfId);

      if (declineError) throw declineError;

      // Create notification for member
      if (psfData?.profiles?.user_id) {
        await createNotification(
          psfData.profiles.user_id,
          "PSF Payment Declined ❌",
          `Your Project Support Fund payment has been declined. Please contact support or re-upload a valid receipt.`,
          "psf_declined",
          psfId
        );
      }

      toast.success(`PSF payment for ${memberName} declined`);
      fetchPSFContributions();
    } catch (error: any) {
      console.error("Error declining PSF:", error);
      toast.error(error.message || "Failed to decline PSF");
    } finally {
      setProcessingId(null);
    }
  };

  const viewReceipt = async (receiptUrl: string) => {
    try {
      let fullUrl = receiptUrl;
      if (!receiptUrl.startsWith("http")) {
        const { data, error } = await supabase.storage
          .from("payment-receipts")
          .createSignedUrl(receiptUrl, 3600);

        if (error) throw error;
        fullUrl = data.signedUrl;
      }
      window.open(fullUrl, "_blank");
    } catch (error: any) {
      console.error("Error viewing receipt:", error);
      toast.error("Failed to view receipt");
    }
  };

  const downloadReceipt = async (receiptUrl: string, memberName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("payment-receipts")
        .download(receiptUrl);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PSF_Receipt_${memberName}_${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Receipt downloaded successfully");
    } catch (error: any) {
      console.error("Error downloading receipt:", error);
      toast.error("Failed to download receipt");
    }
  };

  const renderTable = (data: PSFContribution[], showActions: boolean, status: string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Member #</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Month</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Receipt</TableHead>
          {showActions && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showActions ? 7 : 6} className="text-center text-muted-foreground">
              No {status} PSF payments
            </TableCell>
          </TableRow>
        ) : (
          data.map((psf) => (
            <TableRow key={psf.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{psf.member_name}</div>
                  <div className="text-sm text-muted-foreground">{psf.member_email}</div>
                </div>
              </TableCell>
              <TableCell>{psf.member_number}</TableCell>
              <TableCell className="font-semibold">₦{psf.amount.toLocaleString()}</TableCell>
              <TableCell>
                {psf.contribution_month
                  ? format(new Date(psf.contribution_month), "MMM yyyy")
                  : "N/A"}
              </TableCell>
              <TableCell>{format(new Date(psf.created_at), "MMM dd, yyyy")}</TableCell>
              <TableCell>
                {psf.receipt_url ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => viewReceipt(psf.receipt_url!)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadReceipt(psf.receipt_url!, psf.member_name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Badge variant="secondary">No Receipt</Badge>
                )}
              </TableCell>
              {showActions && (
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => approvePSF(psf.id, psf.member_name)}
                      disabled={processingId === psf.id}
                    >
                      {processingId === psf.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => declinePSF(psf.id, psf.member_name)}
                      disabled={processingId === psf.id}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1">
        <DashboardHeader />
        <div className="p-8">
          <Card>
            <CardHeader>
              <CardTitle>Project Support Fund Management</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Tabs defaultValue="pending" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="pending">
                      Pending ({pendingPSF.length})
                    </TabsTrigger>
                    <TabsTrigger value="approved">
                      Approved ({approvedPSF.length})
                    </TabsTrigger>
                    <TabsTrigger value="declined">
                      Declined ({declinedPSF.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="pending">
                    {renderTable(pendingPSF, true, "pending")}
                  </TabsContent>

                  <TabsContent value="approved">
                    {renderTable(approvedPSF, false, "approved")}
                  </TabsContent>

                  <TabsContent value="declined">
                    {renderTable(declinedPSF, false, "declined")}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
