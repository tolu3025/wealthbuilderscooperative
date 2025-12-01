import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Download, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

const PendingRegistrations = () => {
  const [pendingRegs, setPendingRegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingRegistrations();
    
    // Set up real-time subscription for profile changes
    const channel = supabase
      .channel('pending-registrations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'registration_status=eq.pending_approval'
        },
        (payload) => {
          console.log('Profile change detected:', payload);
          fetchPendingRegistrations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          registration_fees (
            payment_receipt_url,
            status
          )
        `)
        .eq('registration_status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingRegs(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateMemberNumber = async () => {
    // Generate format: WB + Year + 5 random digits
    const year = new Date().getFullYear().toString().slice(-2);
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    return `WB${year}${randomDigits}`;
  };

  const viewReceipt = async (receiptPath: string) => {
    try {
      // Handle both old URL format and new path format
      let filePath = receiptPath;
      let bucket = 'payment-receipts';
      
      // If it's a full URL, extract the path
      if (receiptPath.includes('http')) {
        const urlParts = receiptPath.split('/storage/v1/object/public/payment-receipts/');
        if (urlParts.length === 2) {
          filePath = urlParts[1];
        } else {
          // Try to open old format URLs directly
          window.open(receiptPath, '_blank');
          return;
        }
      } else if (receiptPath.includes('/')) {
        // New format: "bucket/userId/filename"
        const parts = receiptPath.split('/');
        if (parts[0] === 'payment-receipts') {
          bucket = parts[0];
          filePath = parts.slice(1).join('/');
        } else {
          filePath = receiptPath;
        }
      }
      
      // Create signed URL for viewing (valid for 60 seconds)
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60);
      
      if (error) throw error;
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        throw new Error('Failed to generate view link');
      }
    } catch (error: any) {
      console.error('View error:', error);
      toast.error(error.message || 'Failed to view receipt');
    }
  };

  const downloadReceipt = async (receiptPath: string) => {
    try {
      // Handle both old URL format and new path format
      let filePath = receiptPath;
      let bucket = 'payment-receipts';
      
      // If it's a full URL, extract the path
      if (receiptPath.includes('http')) {
        const urlParts = receiptPath.split('/storage/v1/object/public/payment-receipts/');
        if (urlParts.length === 2) {
          filePath = urlParts[1];
        } else {
          throw new Error('Invalid receipt URL format');
        }
      } else if (receiptPath.includes('/')) {
        // New format: "bucket/userId/filename"
        const parts = receiptPath.split('/');
        if (parts[0] === 'payment-receipts') {
          bucket = parts[0];
          filePath = parts.slice(1).join('/');
        } else {
          filePath = receiptPath;
        }
      }
      
      // Download using Supabase storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(filePath);
      
      if (error) throw error;
      
      // Create download link
      const fileExtension = filePath.split('.').pop() || 'jpg';
      const blob = new Blob([data], { type: data.type });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registration-receipt-${Date.now()}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Receipt downloaded successfully');
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download receipt');
    }
  };

  const approveRegistration = async (profileId: string) => {
    try {
      const memberNumber = await generateMemberNumber();
      
      // CRITICAL: Update registration fee status to 'approved' FIRST
      // This triggers create_referral_commissions() database function
      const { error: feeError } = await supabase
        .from('registration_fees')
        .update({ status: 'approved' })
        .eq('member_id', profileId);

      if (feeError) throw feeError;
      
      // Update profile to active status with member number
      // This triggers approve_commissions_on_activation() which approves pending commissions
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          registration_status: 'active',
          member_number: memberNumber,
          registration_pin: null // Clear any existing PIN
        })
        .eq('id', profileId);

      if (updateError) throw updateError;
      
      // Create member balance record
      const { error: balanceError } = await supabase
        .from('member_balances')
        .insert({ member_id: profileId });
      
      if (balanceError && !balanceError.message.includes('duplicate')) {
        throw balanceError;
      }
      
      // Get profile details for notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .eq('id', profileId)
        .single();
        
      if (profile) {
        // Send in-app notification
        await supabase
          .from('notifications')
          .insert({
            user_id: profile.user_id,
            title: '🎉 Account Activated!',
            message: `Welcome ${profile.first_name}! Your account is now active. Your member number is: ${memberNumber}`,
            type: 'activation'
          });
      }
      
      toast.success(`Account activated! Member #: ${memberNumber}`, {
        description: `${profile?.first_name} ${profile?.last_name} can now access their dashboard`,
        duration: 5000
      });
      
      fetchPendingRegistrations();
    } catch (error: any) {
      console.error('Activation error:', error);
      toast.error('Failed to activate account: ' + error.message);
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
              <h1 className="text-3xl font-bold mb-2">Pending Registrations</h1>
              <p className="text-muted-foreground">
                Review payment proofs and approve new members
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Registration Approvals</CardTitle>
                <CardDescription>
                  Review and activate new member accounts directly
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRegs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending registrations</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Payment Proof</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRegs.map((reg) => (
                        <TableRow key={reg.id}>
                          <TableCell className="font-medium">
                            {reg.first_name} {reg.last_name}
                          </TableCell>
                          <TableCell>{reg.email}</TableCell>
                          <TableCell>{reg.phone}</TableCell>
                          <TableCell>{reg.state}</TableCell>
                          <TableCell>{new Date(reg.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {reg.registration_fees?.[0]?.payment_receipt_url ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => downloadReceipt(reg.registration_fees[0].payment_receipt_url)}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => viewReceipt(reg.registration_fees[0].payment_receipt_url)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No receipt</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => approveRegistration(reg.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Activate Account
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

export default PendingRegistrations;
