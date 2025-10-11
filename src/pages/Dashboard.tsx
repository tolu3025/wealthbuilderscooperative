import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Wallet, 
  TrendingUp, 
  PiggyBank, 
  Gift,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MemberData {
  name: string;
  memberNumber: string;
  totalCapital: number;
  totalSavings: number;
  monthlyContribution: number;
  eligibleForDividend: boolean;
  memberSince: string;
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
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast({
            title: "Authentication Required",
            description: "Please log in to view your dashboard",
            variant: "destructive"
          });
          return;
        }

        // Fetch user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;

        // Fetch contributions
        const { data: contributions, error: contributionsError } = await supabase
          .from('contributions')
          .select('*')
          .eq('member_id', profile.id)
          .order('created_at', { ascending: false });

        if (contributionsError) throw contributionsError;

        // Calculate totals
        const totalCapital = contributions?.reduce((sum, c) => sum + Number(c.capital_amount), 0) || 0;
        const totalSavings = contributions?.reduce((sum, c) => sum + Number(c.savings_amount), 0) || 0;
        
        // Check eligibility (6 months and ₦50,000 capital)
        const memberSinceDate = new Date(profile.created_at);
        const monthsSinceMembership = (new Date().getTime() - memberSinceDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        const eligibleForDividend = monthsSinceMembership >= 6 && totalCapital >= 50000;

        setMemberData({
          name: `${profile.first_name} ${profile.last_name}`,
          memberNumber: profile.member_number || 'N/A',
          totalCapital,
          totalSavings,
          monthlyContribution: 5200,
          eligibleForDividend,
          memberSince: new Date(profile.created_at).toLocaleDateString()
        });

        // Format transactions
        const formattedTransactions = contributions?.slice(0, 5).map(c => ({
          id: c.id,
          type: 'contribution',
          amount: Number(c.amount),
          date: new Date(c.created_at).toLocaleDateString(),
          status: c.payment_status
        })) || [];

        setRecentTransactions(formattedTransactions);

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

    fetchDashboardData();
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!memberData) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No member data found</p>
          <Button onClick={() => window.location.href = '/register'}>Register Now</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome back, {memberData.name}!</h1>
          <p className="text-white/80 text-sm md:text-base">Member ID: {memberData.memberNumber}</p>
          <p className="text-white/70 text-xs md:text-sm mt-1">Member since: {memberData.memberSince}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                80% of contributions
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
                Available after 6 months
              </p>
            </CardContent>
          </Card>

          {/* Monthly Contribution */}
          <Card className="border-l-4 border-l-accent shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Contribution
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold">
                ₦{memberData.monthlyContribution.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ₦5,000 + ₦200 support
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
              <div className="text-xl md:text-2xl font-bold text-green-500">
                {memberData.eligibleForDividend ? "Eligible" : "In Progress"}
              </div>
              <p className="text-xs text-green-600 mt-1">
                {memberData.eligibleForDividend 
                  ? "✓ Qualified for next dividend" 
                  : "Build ₦50K capital + 6 months"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <Card className="lg:col-span-2 shadow-md">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        transaction.type === "contribution" 
                          ? "bg-primary/10" 
                          : "bg-secondary/10"
                      }`}>
                        {transaction.type === "contribution" ? (
                          <ArrowUpRight className={`h-5 w-5 ${
                            transaction.type === "contribution" 
                              ? "text-primary" 
                              : "text-secondary"
                          }`} />
                        ) : (
                          <ArrowDownRight className="h-5 w-5 text-secondary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{transaction.type}</p>
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
              <Button variant="outline" className="w-full mt-4">
                View All Transactions
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full gradient-primary text-white">
                Make Contribution
              </Button>
              <Button variant="outline" className="w-full">
                Request Withdrawal
              </Button>
              <Button variant="outline" className="w-full">
                View Dividend History
              </Button>
              <Button variant="outline" className="w-full">
                Update Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
