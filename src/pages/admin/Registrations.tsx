import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Download, Loader2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

const Registrations = () => {
  const [pendingRegs, setPendingRegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingRegistrations();
  }, []);

  const fetchPendingRegistrations = async () => {
    try {
      const { data: regFees } = await supabase
        .from('registration_fees')
        .select(`
          *,
          profiles!registration_fees_member_id_fkey(*)
        `)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false });

      setPendingRegs(regFees || []);
    } catch (error: any) {
      console.error('Error fetching registrations:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateMemberNumber = async () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    return `WB${year}${randomDigits}`;
  };

  const approveRegistration = async (regFeeId: string, profileId: string) => {
    try {
      const memberNumber = await generateMemberNumber();
      
      // Update registration fee status
      const { error: feeError } = await supabase
        .from('registration_fees')
        .update({ status: 'approved' })
        .eq('id', regFeeId);

      if (feeError) throw feeError;

      // Update profile to active with member number
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          registration_status: 'active',
          member_number: memberNumber,
          registration_pin: null
        })
        .eq('id', profileId);

      if (profileError) throw profileError;
      
      // Create member balance record
      const { error: balanceError } = await supabase
        .from('member_balances')
        .insert({ member_id: profileId });
      
      if (balanceError && !balanceError.message.includes('duplicate')) {
        throw balanceError;
      }
      
      // Get profile for notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, first_name')
        .eq('id', profileId)
        .single();
        
      if (profile) {
        await supabase
          .from('notifications')
          .insert({
            user_id: profile.user_id,
            title: '🎉 Account Activated!',
            message: `Welcome ${profile.first_name}! Your account is active. Member #: ${memberNumber}`,
            type: 'activation'
          });
      }
      
      toast.success(`Account activated! Member #: ${memberNumber}`, {
        duration: 5000
      });
      
      fetchPendingRegistrations();
    } catch (error: any) {
      toast.error(error.message);
    }
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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">Registration Approvals</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Review payment proofs and approve new member registrations
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg md:text-xl">
                  Registration Approvals ({pendingRegs.filter(r => r.status === 'pending').length} pending)
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Verify payment receipts and generate activation PINs. PIN will be automatically copied to clipboard.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRegs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm sm:text-base">No pending registrations</p>
                ) : (
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRegs.map((reg) => (
                        <TableRow key={reg.id}>
                          <TableCell className="font-medium">
                            {reg.profiles?.first_name} {reg.profiles?.last_name}
                          </TableCell>
                          <TableCell>{reg.profiles?.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{reg.profiles?.state}</Badge>
                          </TableCell>
                          <TableCell>{reg.profiles?.phone}</TableCell>
                          <TableCell>
                            {reg.payment_receipt_url ? (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => viewReceipt(reg.payment_receipt_url)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => downloadReceipt(reg.payment_receipt_url)}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              </div>
                            ) : (
                              <Badge variant="secondary">No receipt</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={reg.status === 'approved' ? 'default' : 'secondary'}>
                              {reg.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(reg.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {reg.status === 'approved' ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                ✓ Approved
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => approveRegistration(reg.id, reg.profiles.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Activate Account
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

export default Registrations;
