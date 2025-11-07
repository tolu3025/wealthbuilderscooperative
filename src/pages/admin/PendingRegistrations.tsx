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

  const generateMemberNumber = async () => {
    // Generate format: WB + Year + 5 random digits
    const year = new Date().getFullYear().toString().slice(-2);
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    return `WB${year}${randomDigits}`;
  };

  const approveRegistration = async (profileId: string) => {
    try {
      const memberNumber = await generateMemberNumber();
      
      // Update profile to active status with member number
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
