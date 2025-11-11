import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, TrendingUp, Loader2, Wallet, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MemberSidebar } from "@/components/MemberSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Dividend {
  id: string;
  amount: number;
  distribution_date: string;
  status: string;
  dividend_percentage: number;
  property_name: string | null;
  member_capital_at_distribution: number;
}

interface DividendBalance {
  available: number;
  pending: number;
  withdrawn: number;
}

const Dividends = () => {
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [totalEarned, setTotalEarned] = useState(0);
  const [dividendBalance, setDividendBalance] = useState<DividendBalance>({
    available: 0,
    pending: 0,
    withdrawn: 0
  });
  const [monthsContributed, setMonthsContributed] = useState(0);
  const [totalContributions, setTotalContributions] = useState(0);
  const [userName, setUserName] = useState("");
  const [profileId, setProfileId] = useState("");
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchDividends();
  }, []);

  const fetchDividends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserName(`${profile.first_name} ${profile.last_name}`);
        setProfileId(profile.id);

        // Fetch member balance info
        const { data: balance } = await supabase
          .from('member_balances')
          .select('months_contributed, total_capital')
          .eq('member_id', profile.id)
          .single();

        setMonthsContributed(balance?.months_contributed || 0);
        setTotalContributions(balance?.total_capital || 0);

        // Fetch all dividends
        const { data: dividendsData, error } = await supabase
          .from('dividends')
          .select('*')
          .eq('member_id', profile.id)
          .order('distribution_date', { ascending: false });

        if (error) throw error;

        setDividends(dividendsData || []);
        
        // Calculate total earned
        const totalEarnedAmount = dividendsData?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
        setTotalEarned(totalEarnedAmount);

        // Fetch withdrawal requests to calculate withdrawn and pending amounts
        const { data: withdrawalRequests } = await supabase
          .from('withdrawal_requests')
          .select('amount, status')
          .eq('member_id', profile.id)
          .eq('withdrawal_type', 'dividend');

        const withdrawnAmount = withdrawalRequests
          ?.filter(w => w.status === 'approved' || w.status === 'completed')
          .reduce((sum, w) => sum + Number(w.amount), 0) || 0;

        const pendingAmount = withdrawalRequests
          ?.filter(w => w.status === 'pending')
          .reduce((sum, w) => sum + Number(w.amount), 0) || 0;

        const availableAmount = totalEarnedAmount - withdrawnAmount - pendingAmount;
        
        setDividendBalance({ 
          available: availableAmount, 
          pending: pendingAmount, 
          withdrawn: withdrawnAmount 
        });
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

  const handleWithdrawDividend = async () => {
    try {
      const amount = parseFloat(withdrawalForm.amount);
      
      if (!amount || amount < 1000) {
        toast({
          title: "Invalid Amount",
          description: "Minimum withdrawal is ₦1,000",
          variant: "destructive",
        });
        return;
      }

      if (amount > dividendBalance.available) {
        toast({
          title: "Insufficient Balance",
          description: `Available dividend balance: ₦${dividendBalance.available.toLocaleString()}`,
          variant: "destructive",
        });
        return;
      }

      if (!withdrawalForm.accountName || !withdrawalForm.accountNumber || !withdrawalForm.bankName) {
        toast({
          title: "Missing Information",
          description: "Please fill in all bank details",
          variant: "destructive",
        });
        return;
      }

      setSubmitting(true);

      // Create withdrawal request
      const { error: withdrawError } = await supabase
        .from('withdrawal_requests')
        .insert({
          member_id: profileId,
          amount,
          account_name: withdrawalForm.accountName,
          account_number: withdrawalForm.accountNumber,
          bank_name: withdrawalForm.bankName,
          withdrawal_type: 'dividend',
          status: 'pending',
        });

      if (withdrawError) throw withdrawError;

      toast({
        title: "Withdrawal Requested",
        description: "Your dividend withdrawal request has been submitted for approval",
      });

      setWithdrawalForm({
        amount: "",
        accountName: "",
        accountNumber: "",
        bankName: "",
      });

      fetchDividends();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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
              <h1 className="text-3xl font-bold mb-2">Dividend Management</h1>
              <p className="text-muted-foreground">
                Track and withdraw your dividend earnings
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Dividends are distributed monthly based on your capital contribution.
                You must have ≥₦50,000 capital and 3+ months of contributions to qualify.
                Minimum withdrawal amount is ₦1,000.
              </AlertDescription>
            </Alert>

            {/* Balance Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Available Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    ₦{dividendBalance.available.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ready to withdraw
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">
                    ₦{dividendBalance.pending.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Awaiting approval
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Withdrawn
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    ₦{dividendBalance.withdrawn.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total paid out
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Earned
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    ₦{totalEarned.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All-time earnings
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Contribution Info & Withdraw Button */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₦{totalContributions.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Months Active</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {monthsContributed} months
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Withdraw Dividends</CardTitle>
                </CardHeader>
                <CardContent>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full" 
                        disabled={dividendBalance.available < 1000}
                        size="lg"
                      >
                        {dividendBalance.available < 1000 
                          ? "Minimum ₦1,000 Required" 
                          : "Withdraw Now"}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Withdraw Dividend</DialogTitle>
                        <DialogDescription>
                          Enter your bank details to request withdrawal. Available: ₦{dividendBalance.available.toLocaleString()}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Amount (₦)</Label>
                          <Input
                            id="amount"
                            type="number"
                            placeholder="Enter amount (min ₦1,000)"
                            value={withdrawalForm.amount}
                            onChange={(e) => setWithdrawalForm({...withdrawalForm, amount: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accountName">Account Name</Label>
                          <Input
                            id="accountName"
                            placeholder="Enter account name"
                            value={withdrawalForm.accountName}
                            onChange={(e) => setWithdrawalForm({...withdrawalForm, accountName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accountNumber">Account Number</Label>
                          <Input
                            id="accountNumber"
                            placeholder="Enter account number"
                            value={withdrawalForm.accountNumber}
                            onChange={(e) => setWithdrawalForm({...withdrawalForm, accountNumber: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bankName">Bank Name</Label>
                          <Input
                            id="bankName"
                            placeholder="Enter bank name"
                            value={withdrawalForm.bankName}
                            onChange={(e) => setWithdrawalForm({...withdrawalForm, bankName: e.target.value})}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleWithdrawDividend} disabled={submitting}>
                          {submitting ? "Submitting..." : "Submit Request"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Dividend History
                </CardTitle>
                <CardDescription>
                  Complete history of all dividend distributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dividends.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm sm:text-base text-muted-foreground">No dividends received yet</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                      Keep contributing to reach eligibility (₦50,000 + 3 months)
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Your Capital</TableHead>
                        <TableHead>Share %</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dividends.map((dividend) => (
                        <TableRow key={dividend.id}>
                          <TableCell>
                            {new Date(dividend.distribution_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long'
                            })}
                          </TableCell>
                          <TableCell>
                            ₦{Number(dividend.member_capital_at_distribution || 0).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {dividend.dividend_percentage?.toFixed(2)}%
                          </TableCell>
                          <TableCell className="font-semibold text-lg">
                            ₦{Number(dividend.amount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                dividend.status === 'withdrawn' ? 'default' : 
                                dividend.status === 'pending' ? 'secondary' : 
                                'outline'
                              }
                            >
                              {dividend.status === 'calculated' ? 'Available' : dividend.status}
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

export default Dividends;
