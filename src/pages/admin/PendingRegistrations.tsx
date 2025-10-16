import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
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
  }, []);

  const fetchPendingRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
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

  const generatePIN = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const approveRegistration = async (profileId: string) => {
    try {
      const pin = generatePIN();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          registration_status: 'pending_activation',
          registration_pin: pin
        })
        .eq('id', profileId);

      if (error) throw error;
      
      toast.success(`Registration approved! PIN: ${pin}`, {
        description: `Send this PIN to the member via WhatsApp: +234 803 374 0309`,
        duration: 10000
      });
      fetchPendingRegistrations();
    } catch (error: any) {
      toast.error(error.message);
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
                  Send generated PINs via WhatsApp: +234 803 374 0309
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
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => approveRegistration(reg.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Generate PIN
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
