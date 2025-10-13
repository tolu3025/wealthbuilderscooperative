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

  const generatePIN = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const approveRegistration = async (regFeeId: string, profileId: string) => {
    try {
      const pin = generatePIN();
      
      // Update registration fee status
      const { error: feeError } = await supabase
        .from('registration_fees')
        .update({ status: 'approved' })
        .eq('id', regFeeId);

      if (feeError) throw feeError;

      // Update profile with PIN and status
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          registration_status: 'pending_activation',
          registration_pin: pin
        })
        .eq('id', profileId);

      if (profileError) throw profileError;
      
      toast.success(`Registration approved!`, {
        description: `PIN: ${pin} - Copy this and send via WhatsApp`,
        duration: 15000
      });
      
      // Copy PIN to clipboard automatically
      navigator.clipboard.writeText(pin);
      
      fetchPendingRegistrations();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const downloadReceipt = async (receiptUrl: string) => {
    try {
      // Extract the file path from the Supabase storage URL
      const url = new URL(receiptUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === 'payment-receipts');
      
      if (bucketIndex === -1) {
        throw new Error('Invalid receipt URL');
      }
      
      const filePath = pathParts.slice(bucketIndex + 1).join('/');
      
      // Download using Supabase storage
      const { data, error } = await supabase.storage
        .from('payment-receipts')
        .download(filePath);
      
      if (error) throw error;
      
      // Create download link
      const url2 = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url2;
      a.download = `registration-receipt-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url2);
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
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => downloadReceipt(reg.payment_receipt_url)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
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
                                Approve & Generate PIN
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
