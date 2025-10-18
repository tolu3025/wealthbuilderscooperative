import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Users, DollarSign, Loader2, Share2 } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchReferralData();
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

        // Get commissions
        const { data: commissionsData } = await supabase
          .from('commissions')
          .select('*')
          .eq('member_id', profile.id)
          .order('created_at', { ascending: false });

        setCommissions(commissionsData || []);
        const total = commissionsData?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;
        setTotalEarned(total);
      }
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

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard",
    });
  };

  const shareInviteLink = () => {
    const link = `${window.location.origin}/register?ref=${inviteCode}`;
    if (navigator.share) {
      navigator.share({
        title: 'Join WealthBuilders Cooperative',
        text: `Use my code ${inviteCode} to join WealthBuilders!`,
        url: link
      });
    } else {
      navigator.clipboard.writeText(link);
      toast({
        title: "Link copied!",
        description: "Share this link with friends",
      });
    }
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
              <h1 className="text-3xl font-bold mb-2">Invite</h1>
              <p className="text-muted-foreground">
                Earn ₦500 for every member you invite
              </p>
            </div>

            <Alert className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary">
              <Share2 className="h-4 w-4" />
              <AlertDescription className="font-medium">
                <strong>Earn ₦500 per invite!</strong> Share your invite code and earn commission when new members join.
              </AlertDescription>
            </Alert>

            <Card className="border-primary shadow-lg">
              <CardHeader>
                <CardTitle>Your Invite Code</CardTitle>
                <CardDescription>Share this code with friends and family</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted px-4 py-3 rounded-lg font-mono text-2xl font-bold text-center">
                    {inviteCode}
                  </code>
                  <Button size="lg" onClick={copyInviteCode}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <Button 
                  className="w-full" 
                  variant="outline" 
                  size="lg"
                  onClick={shareInviteLink}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Invite Link
                </Button>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
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
                    Commission earned
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
