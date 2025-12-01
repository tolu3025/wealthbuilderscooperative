import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Users, DollarSign, Loader2, Share2, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MemberSidebar } from "@/components/MemberSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

interface Commission {
  id: string;
  amount: number;
  commission_type: string;
  created_at: string;
  status: string;
}

const Referrals = () => {
  const [inviteCode, setInviteCode] = useState("");
  const [referralCount, setReferralCount] = useState(0);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchReferralData();
    
    // Set up real-time subscription for profile changes (new referrals)
    const profileChannel = supabase
      .channel('referrals-profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('Profile change detected:', payload);
          fetchReferralData();
        }
      )
      .subscribe();

    // Set up real-time subscription for commission changes
    const commissionChannel = supabase
      .channel('referrals-commission-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commissions'
        },
        (payload) => {
          console.log('Commission change detected:', payload);
          fetchReferralData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(commissionChannel);
    };
  }, []);

  const fetchReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, invite_code')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserName(`${profile.first_name} ${profile.last_name}`);
        setInviteCode(profile.invite_code || '');

        // Get referral count - only count active members
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('invited_by', profile.id)
          .eq('registration_status', 'active');
        setReferralCount(count || 0);

        // Get commissions for display
        const { data: commissionsData } = await supabase
          .from('commissions')
          .select('*')
          .eq('member_id', profile.id)
          .order('created_at', { ascending: false });

        setCommissions(commissionsData || []);
        
        // Calculate total earned from approved commissions
        const commissionEarnings = commissionsData
          ?.filter(c => c.status === 'approved')
          .reduce((sum, c) => sum + Number(c.amount), 0) || 0;

        // Get MLM earnings (exclude company shares)
        const { data: mlmData } = await supabase
          .from('mlm_distributions')
          .select('amount')
          .eq('member_id', profile.id)
          .eq('is_company_share', false);

        const mlmEarnings = mlmData?.reduce((sum, m) => sum + Number(m.amount), 0) || 0;

        // Get approved withdrawals
        const { data: withdrawalData } = await supabase
          .from('withdrawal_requests')
          .select('amount')
          .eq('member_id', profile.id)
          .eq('withdrawal_type', 'bonus')
          .eq('status', 'approved');

        const withdrawnAmount = withdrawalData?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

        // Total earned = commissions + MLM (all-time earnings including withdrawn)
        setTotalEarned(commissionEarnings + mlmEarnings);

        // Available balance = total earned - withdrawn
        const calculatedBalance = commissionEarnings + mlmEarnings - withdrawnAmount;

        // Get balance from member_balances table
        const { data: balance } = await supabase
          .from('member_balances')
          .select('total_commissions')
          .eq('member_id', profile.id)
          .maybeSingle();
        
        // Use database balance (which should match calculated balance after fix)
        setAvailableBalance(balance?.total_commissions || 0);

        // Log for debugging if there's a mismatch
        if (balance && Math.abs(balance.total_commissions - calculatedBalance) > 0.01) {
          console.warn('Balance mismatch detected:', {
            database: balance.total_commissions,
            calculated: calculatedBalance,
            commissions: commissionEarnings,
            mlm: mlmEarnings,
            withdrawn: withdrawnAmount
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching referral data:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard",
    });
  };

  const shareInviteLink = () => {
    const link = `${window.location.origin}/register?ref=${inviteCode}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Share this invite link with friends",
    });
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <MemberSidebar />
          <div className="flex-1 flex flex-col">
            <DashboardHeader userName={userName} />
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <MemberSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader userName={userName} />
          <main className="flex-1 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">
            <div>
              <h1 className="text-3xl font-bold mb-2">Invite and Real Estate Bonus Dashboard</h1>
              <p className="text-muted-foreground">
                Earn ₦1,000 for every member you invite
              </p>
            </div>

            <Alert className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary">
              <Share2 className="h-4 w-4" />
              <AlertDescription className="font-medium">
                <strong>Earn ₦1,000 per invite!</strong> Share your invite code and earn commission when new members join.
              </AlertDescription>
            </Alert>

            <Card className="border-primary shadow-lg">
              <CardHeader>
                <CardTitle>Your Invite Link</CardTitle>
                <CardDescription>Share this link with friends and family</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-4 py-3 rounded-lg text-sm break-all">
                    {`${window.location.origin}/register?ref=${inviteCode}`}
                  </code>
                  <Button size="lg" onClick={shareInviteLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Total Invites
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-primary">
                    {referralCount}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Members referred
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Available Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600">
                    ₦{availableBalance.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Current withdrawable balance
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-secondary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Total Earned
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-secondary">
                    ₦{totalEarned.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    All-time earnings (including withdrawn)
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Commission History</CardTitle>
                <CardDescription>Track your invite earnings</CardDescription>
              </CardHeader>
              <CardContent>
                {commissions.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm sm:text-base text-muted-foreground">No commissions yet</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                      Start referring to earn commissions
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell>
                            {new Date(commission.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="capitalize">
                            {commission.commission_type?.replace('_', ' ')}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ₦{Number(commission.amount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'}>
                              {commission.status}
                            </Badge>
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

export default Referrals;
