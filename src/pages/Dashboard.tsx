import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { 
  Wallet, 
  TrendingUp, 
  PiggyBank, 
  Gift,
  ArrowUpRight,
  Loader2,
  Users,
  Phone,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MemberSidebar } from "@/components/MemberSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { PaymentWarningBanner } from "@/components/PaymentWarningBanner";

interface MemberData {
  id: string;
  name: string;
  memberNumber: string;
  totalCapital: number;
  totalSavings: number;
  monthlyContribution: number;
  eligibleForDividend: boolean;
  memberSince: string;
  inviteCode: string;
  invitedBy: string | null;
  state: string;
  referralCount: number;
  totalCommissions: number;
  recentDividends: number;
  dividendBalance: number;
  nextContributionDue: string;
}

interface StateRep {
  name: string;
  whatsapp: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  status: string;
}

const Dashboard = () => {
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [stateRep, setStateRep] = useState<StateRep | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time subscriptions for data changes
    const contributionChannel = supabase
      .channel('dashboard-contribution-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contributions'
        },
        () => fetchDashboardData()
      )
      .subscribe();

    const commissionChannel = supabase
      .channel('dashboard-commission-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commissions'
        },
        () => fetchDashboardData()
      )
      .subscribe();

    const profileChannel = supabase
      .channel('dashboard-profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        () => fetchDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contributionChannel);
      supabase.removeChannel(commissionChannel);
      supabase.removeChannel(profileChannel);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view your dashboard",
          variant: "destructive"
        });
        navigate("/login");
        return;
      }

      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Block access if account is not active
      if (profile.registration_status !== 'active') {
        toast({
          title: "Account Pending Activation",
          description: "Your registration is being reviewed by our admin team. You'll be notified once activated.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (profile) {
        setUserName(`${profile.first_name} ${profile.last_name}`);
        setAvatarUrl(profile.avatar_url || "");

        // Fetch member balance
        const { data: balance } = await supabase
          .from('member_balances')
          .select('*')
          .eq('member_id', profile.id)
          .single();

        const totalCapital = balance?.total_capital || 0;
        const totalSavings = balance?.total_savings || 0;
        const totalCommissions = balance?.total_commissions || 0;
        const monthsContributed = balance?.months_contributed || 0;
        const eligibleForDividend = balance?.eligible_for_dividend || false;

        // Calculate total dividends earned from dividends table
        const { data: allDividends } = await supabase
          .from('dividends')
          .select('amount')
          .eq('member_id', profile.id);

        const totalDividendsEarned = allDividends?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

        // Calculate total withdrawn dividends from withdrawal_requests
        const { data: dividendWithdrawals } = await supabase
          .from('withdrawal_requests')
          .select('amount')
          .eq('member_id', profile.id)
          .eq('withdrawal_type', 'dividend')
          .in('status', ['approved', 'completed']);

        const totalWithdrawn = dividendWithdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

        // Available dividend balance = earned - withdrawn
        const totalDividends = totalDividendsEarned - totalWithdrawn;

        // Fetch contributions for transactions
        const { data: contributions } = await supabase
          .from('contributions')
          .select('*')
          .eq('member_id', profile.id)
          .order('created_at', { ascending: false });

        // Fetch referrals count (only active members)
        const { count: referralCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('invited_by', profile.id)
          .eq('registration_status', 'active');

        // Fetch recent dividends for display only
        const { data: dividends } = await supabase
          .from('dividends')
          .select('amount')
          .eq('member_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const recentDividends = dividends?.[0]?.amount || 0;

        // Calculate next contribution due
        const lastContribution = contributions?.[0]?.created_at;
        const nextDue = lastContribution 
          ? new Date(new Date(lastContribution).setMonth(new Date(lastContribution).getMonth() + 1))
          : new Date();

        setMemberData({
          id: profile.id,
          name: `${profile.first_name} ${profile.last_name}`,
          memberNumber: profile.member_number || 'Pending',
          totalCapital,
          totalSavings,
          monthlyContribution: 5500,
          eligibleForDividend,
          memberSince: new Date(profile.created_at).toLocaleDateString(),
          inviteCode: profile.invite_code || '',
          invitedBy: profile.invited_by,
          state: profile.state || '',
          referralCount: referralCount || 0,
          totalCommissions: totalCommissions,
          recentDividends,
          dividendBalance: totalDividends,
          nextContributionDue: nextDue.toLocaleDateString()
        });

        // Fetch state representative
        if (profile.state) {
          const { data: repData } = await supabase
            .from('state_representatives')
            .select(`
              rep_profile_id,
              whatsapp_number,
              profiles!state_representatives_rep_profile_id_fkey(first_name, last_name)
            `)
            .eq('state', profile.state)
            .single();

          if (repData && repData.profiles) {
            const repProfile: any = repData.profiles;
            setStateRep({
              name: `${repProfile.first_name} ${repProfile.last_name}`,
              whatsapp: repData.whatsapp_number || 'Not available'
            });
          }
        }

        // Format transactions
        const formattedTransactions = contributions?.slice(0, 5).map(c => ({
          id: c.id,
          type: 'Contribution',
          amount: Number(c.amount),
          date: new Date(c.created_at).toLocaleDateString(),
          status: c.payment_status
        })) || [];

        setRecentTransactions(formattedTransactions);
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <MemberSidebar />
          <div className="flex-1 flex flex-col">
            <DashboardHeader userName={userName} avatarUrl={avatarUrl} />
            <div className="flex-1 flex items-center justify-center bg-muted/30">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading dashboard...</p>
              </div>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  if (!memberData) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <MemberSidebar />
          <div className="flex-1 flex flex-col">
            <DashboardHeader userName={userName} avatarUrl={avatarUrl} />
            <div className="flex-1 flex items-center justify-center bg-muted/30">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">No member data found</p>
                <Button onClick={() => navigate('/register')}>Register Now</Button>
              </div>
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  const copyInviteCode = () => {
    if (memberData?.inviteCode) {
      navigator.clipboard.writeText(memberData.inviteCode);
      toast({
        title: "Copied!",
        description: "Invite code copied to clipboard"
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <MemberSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader userName={userName} avatarUrl={avatarUrl} />
          <main className="flex-1 p-6 bg-muted/30 overflow-auto">
            <AnnouncementBanner />
            <PaymentWarningBanner />
            {/* Welcome Section */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Welcome back, {memberData.name.split(' ')[0]}! 👋</h1>
              <p className="text-muted-foreground">Member ID: {memberData.memberNumber} • Member since: {memberData.memberSince}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Total Capital */}
              <Card className="border-l-4 border-l-primary shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Capital
                  </CardTitle>
                  <Wallet className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    ₦{memberData.totalCapital.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Investment pool contribution
                  </p>
                </CardContent>
              </Card>

              {/* Total Savings */}
              <Card className="border-l-4 border-l-secondary shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Savings
                  </CardTitle>
                  <PiggyBank className="h-5 w-5 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-secondary">
                    ₦{memberData.totalSavings.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Withdrawable after 3 months
                  </p>
                </CardContent>
              </Card>

              {/* Monthly Contribution */}
              <Card className="border-l-4 border-l-accent shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Next Payment Due
                  </CardTitle>
                  <TrendingUp className="h-5 w-5 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold">
                    {memberData.nextContributionDue}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ₦{memberData.monthlyContribution.toLocaleString()} monthly
                  </p>
                </CardContent>
              </Card>

              {/* Eligibility Status */}
              <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Dividend Status
                  </CardTitle>
                  <Gift className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-green-500">
                    {memberData.eligibleForDividend ? "Eligible ✓" : "In Progress"}
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    {memberData.eligibleForDividend 
                      ? "Qualified for dividends" 
                      : "Build ₦50K + 3 months"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Dividend Balance Section */}
            <Card className="shadow-md bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-600" />
                  Dividend Wallet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                  <div className="text-4xl font-bold text-purple-600">
                    ₦{memberData.dividendBalance.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {memberData.dividendBalance >= 1000 
                      ? "Ready to withdraw" 
                      : `₦${(1000 - memberData.dividendBalance).toLocaleString()} more to reach minimum`}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Last Distribution</p>
                    <p className="text-lg font-semibold">₦{memberData.recentDividends.toLocaleString()}</p>
                  </div>
                  <Button 
                    className="bg-purple-600 hover:bg-purple-700" 
                    asChild
                    disabled={memberData.dividendBalance < 1000}
                  >
                    <Link to="/member/dividends">
                      {memberData.dividendBalance >= 1000 ? "Withdraw" : "View Details"}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Invite Bonus Card */}
            <Card className="shadow-md bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-600" />
                  Invite Bonus Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Referrals</p>
                    <div className="text-3xl font-bold text-amber-600">
                      {memberData.referralCount}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Active members</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
                    <div className="text-3xl font-bold text-orange-600">
                      ₦{memberData.totalCommissions.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">₦1,000 per referral</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <div>
                    <p className="text-sm text-muted-foreground">Your Invite Code</p>
                    <code className="text-lg font-mono font-bold text-amber-700">{memberData.inviteCode}</code>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={copyInviteCode}>
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-amber-600 hover:bg-amber-700"
                      asChild
                    >
                      <Link to="/member/referrals">View All</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Three Column Layout */}
            <div className="grid lg:grid-cols-2 gap-4 mb-6">

              {/* State Rep Info */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-secondary" />
                    State Representative
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stateRep ? (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-semibold">{stateRep.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">WhatsApp</p>
                        <p className="font-semibold">{stateRep.whatsapp}</p>
                      </div>
                      <Button className="w-full" variant="outline" asChild>
                        <a href={`https://wa.me/${stateRep.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                          Contact on WhatsApp
                        </a>
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No representative assigned for {memberData.state} yet.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full gradient-primary text-white" asChild>
                    <Link to="/contribute">Make Contribution</Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/withdraw">Request Withdrawal</Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/member/dividends">View Dividend History</Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/member/profile">Update Profile</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {recentTransactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No transactions yet</p>
                ) : (
                  <div className="space-y-4">
                    {recentTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-full bg-primary/10">
                            <ArrowUpRight className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{transaction.type}</p>
                            <p className="text-sm text-muted-foreground">{transaction.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₦{transaction.amount.toLocaleString()}</p>
                          <p className="text-xs text-green-600 capitalize">{transaction.status}</p>
                        </div>
                      </div>
                    ))}
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

export default Dashboard;
