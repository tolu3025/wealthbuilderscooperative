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
        .eq('status', 'pending');

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
      
      toast.success(`Registration approved! PIN: ${pin}`, {
        description: `Send this PIN to the member via WhatsApp`,
        duration: 10000
      });
      
      fetchPendingRegistrations();
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
                <CardTitle className="text-base sm:text-lg md:text-xl">Pending Registrations ({pendingRegs.length})</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Verify payment receipts and generate activation PINs
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
                                View
                              </Button>
                            ) : (
                              <Badge variant="secondary">No receipt</Badge>
                            )}
                          </TableCell>
                          <TableCell>{new Date(reg.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => approveRegistration(reg.id, reg.profiles.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve & Generate PIN
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
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Registrations;
