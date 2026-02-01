import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Banknote, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

const withdrawSchema = z.object({
  amount: z.number().min(1000, "Minimum withdrawal is ₦1,000"),
  accountName: z.string().min(3, "Account name is required"),
  accountNumber: z.string().min(10, "Valid account number required"),
  bankName: z.string().min(3, "Bank name is required"),
});

const Withdraw = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [totalSavings, setTotalSavings] = useState(0);
  const [totalCapital, setTotalCapital] = useState(0);
  const [totalDividends, setTotalDividends] = useState(0);
  const [totalBonuses, setTotalBonuses] = useState(0);
  const [monthsContributed, setMonthsContributed] = useState(0);
  const [requests, setRequests] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    amount: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
    withdrawalType: "savings",
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      
      // Block access if account is not active
      if (profileData.registration_status !== 'active') {
        toast({
          title: "Account Pending Activation",
          description: "Your account is being reviewed. You'll be notified once activated.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }
      
      setProfile(profileData);

      // Fetch member balance (now includes dividends and commissions)
      const { data: balance } = await supabase
        .from('member_balances')
        .select('*')
        .eq('member_id', profileData.id)
        .maybeSingle();

      const savings = balance?.total_savings || 0;
      const capital = balance?.total_capital || 0;
      const totalDivs = balance?.total_dividends || 0;
      const totalBonus = balance?.total_commissions || 0;
      const months = balance?.months_contributed || 0;

      // Fetch pending, approved, AND paid withdrawal requests to subtract from available balance
      // 'paid' is included for safety in case any legacy status exists before normalization
      const { data: pendingWithdrawals } = await supabase
        .from('withdrawal_requests')
        .select('amount, withdrawal_type')
        .eq('member_id', profileData.id)
        .in('status', ['pending', 'approved', 'paid']);

      // Calculate pending amounts per withdrawal type
      const pendingSavings = pendingWithdrawals
        ?.filter(w => w.withdrawal_type === 'savings')
        .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
      const pendingCapital = pendingWithdrawals
        ?.filter(w => w.withdrawal_type === 'capital')
        .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
      const pendingDividends = pendingWithdrawals
        ?.filter(w => w.withdrawal_type === 'dividend')
        .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
      const pendingBonuses = pendingWithdrawals
        ?.filter(w => w.withdrawal_type === 'bonus')
        .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
      
      // Set available balances (subtracting pending withdrawals)
      setTotalSavings(savings - pendingSavings);
      setTotalCapital(capital - pendingCapital);
      setTotalDividends(totalDivs - pendingDividends);
      setTotalBonuses(totalBonus - pendingBonuses);
      setMonthsContributed(months);

      // Fetch withdrawal requests
      const { data: withdrawData, error: withdrawError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('member_id', profileData.id)
        .order('requested_at', { ascending: false });

      if (withdrawError) throw withdrawError;
      setRequests(withdrawData || []);

    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const amount = parseFloat(formData.amount);
      
      withdrawSchema.parse({
        amount,
        accountName: formData.accountName,
        accountNumber: formData.accountNumber,
        bankName: formData.bankName,
      });

      // 3-month restriction applies to all withdrawal types except bonus
      if (monthsContributed < 3 && formData.withdrawalType !== 'bonus') {
        throw new Error("You must contribute for at least 3 months before withdrawing");
      }

      // Calculate total available balance (savings + capital + dividends + bonuses)
      const totalAvailable = totalSavings + totalCapital + totalDividends + totalBonuses;

      if (amount > totalAvailable) {
        throw new Error(`Insufficient balance. Available: ₦${totalAvailable.toLocaleString()}`);
      }

      // Validate based on withdrawal type - prevent negative balances
      if (formData.withdrawalType === 'savings') {
        if (amount > totalSavings || totalSavings <= 0) {
          throw new Error(`Insufficient savings. Available: ₦${totalSavings.toLocaleString()}`);
        }
        if (totalSavings - amount < 0) {
          throw new Error("This withdrawal would result in a negative savings balance");
        }
      } else if (formData.withdrawalType === 'capital') {
        if (amount > totalCapital || totalCapital <= 0) {
          throw new Error(`Insufficient capital. Available: ₦${totalCapital.toLocaleString()}`);
        }
        // Check if withdrawal would drop capital below minimum (₦50,000)
        if (totalCapital - amount < 50000) {
          throw new Error("You cannot withdraw below your minimum share capital of ₦50,000.");
        }
      } else if (formData.withdrawalType === 'dividend') {
        if (amount > totalDividends || totalDividends <= 0) {
          throw new Error(`Insufficient dividend balance. Available: ₦${totalDividends.toLocaleString()}`);
        }
        if (totalDividends - amount < 0) {
          throw new Error("This withdrawal would result in a negative dividend balance");
        }
      } else if (formData.withdrawalType === 'bonus') {
        if (amount > totalBonuses || totalBonuses <= 0) {
          throw new Error(`Insufficient bonus balance. Available: ₦${totalBonuses.toLocaleString()}`);
        }
        if (totalBonuses - amount < 0) {
          throw new Error("This withdrawal would result in a negative bonus balance");
        }
        if (amount < 1000) {
          throw new Error("Minimum bonus withdrawal is ₦1,000");
        }
      }

      setSubmitting(true);

      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          member_id: profile.id,
          amount,
          account_name: formData.accountName,
          account_number: formData.accountNumber,
          bank_name: formData.bankName,
          withdrawal_type: formData.withdrawalType,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "Withdrawal request submitted",
        description: "Your request will be reviewed by the admin team",
      });

      setFormData({
        amount: "",
        accountName: "",
        accountNumber: "",
        bankName: "",
        withdrawalType: "savings",
      });

      fetchData();

    } catch (error: any) {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isEligible = monthsContributed >= 3;
  const totalAvailableBalance = totalSavings + totalCapital + totalDividends + totalBonuses;

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Request Withdrawal</h1>
            <p className="text-muted-foreground">Withdraw from your savings balance</p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ₦{totalSavings.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Capital</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₦{totalCapital.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Dividends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  ₦{totalDividends.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Bonuses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  ₦{totalBonuses.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Inviter's + Real Estate Bonus
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  ₦{totalAvailableBalance.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Months Contributed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {monthsContributed}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Eligibility Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={isEligible ? "default" : "secondary"}>
                  {isEligible ? "Eligible" : "Not Eligible"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {!isEligible && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your funds are locked for 3 months. You must contribute for at least 3 months before you can request a withdrawal.
                You have contributed for {monthsContributed} month(s). After 3 months, you can withdraw from your savings and accumulated dividends.
              </AlertDescription>
            </Alert>
          )}

            {isEligible && totalAvailableBalance > 0 && (
            <Alert>
              <AlertDescription>
                <strong>Withdrawal Information:</strong> After 3 months, you can withdraw from savings (₦{totalSavings.toLocaleString()}), 
                accumulated dividends (₦{totalDividends.toLocaleString()}), and capital (₦{totalCapital.toLocaleString()}, cannot be withdrawn below ₦50,000 minimum).
                <br /><br />
                <strong>Bonus withdrawals:</strong> Available anytime! Includes Inviter's Bonus (₦1,000 per invite) + Real Estate Bonus. Balance: ₦{totalBonuses.toLocaleString()}. Minimum: ₦1,000
              </AlertDescription>
            </Alert>
          )}
          
          {!isEligible && totalBonuses >= 1000 && (
            <Alert>
              <AlertDescription>
                <strong>Bonus Withdrawal Available:</strong> You can withdraw your bonuses (₦{totalBonuses.toLocaleString()}) anytime, even before 3 months! Minimum: ₦1,000
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Withdrawal Request Form
              </CardTitle>
              <CardDescription>
                Enter your withdrawal details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="withdrawalType">Withdrawal Type</Label>
                  <select
                    id="withdrawalType"
                    value={formData.withdrawalType}
                    onChange={(e) => setFormData({ ...formData, withdrawalType: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="savings">Savings (₦{totalSavings.toLocaleString()})</option>
                    <option value="capital">Capital (₦{totalCapital.toLocaleString()})</option>
                    <option value="dividend">Dividend (₦{totalDividends.toLocaleString()})</option>
                    <option value="bonus">All Bonuses (₦{totalBonuses.toLocaleString()} - Inviter's + Real Estate)</option>
                  </select>
                  <p className="text-sm text-muted-foreground">
                    Bonus includes Inviter's Bonus (₦1,000/invite) + Real Estate Bonus. Minimum withdrawal: ₦1,000. No 3-month wait required!
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₦)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    max={totalAvailableBalance}
                    disabled={!isEligible && formData.withdrawalType !== 'bonus'}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Available: ₦{totalAvailableBalance.toLocaleString()} 
                    (Savings: ₦{totalSavings.toLocaleString()}, 
                    Capital: ₦{totalCapital.toLocaleString()}, 
                    Dividends: ₦{totalDividends.toLocaleString()},
                    Bonuses: ₦{totalBonuses.toLocaleString()})
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    placeholder="Enter account name"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    disabled={!isEligible && formData.withdrawalType !== 'bonus'}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    placeholder="Enter account number"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    disabled={!isEligible && formData.withdrawalType !== 'bonus'}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    placeholder="Enter bank name"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    disabled={!isEligible && formData.withdrawalType !== 'bonus'}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={(!isEligible && formData.withdrawalType !== 'bonus') || submitting} 
                  className="w-full" 
                  size="lg"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Withdrawal History</CardTitle>
              <CardDescription>Your withdrawal requests and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No withdrawal requests yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          {new Date(request.requested_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {request.withdrawal_type || 'savings'}
                          </Badge>
                        </TableCell>
                        <TableCell>₦{request.amount.toLocaleString()}</TableCell>
                        <TableCell>{request.bank_name}</TableCell>
                        <TableCell>
                          <Badge variant={
                            request.status === 'completed' ? 'default' :
                            request.status === 'paid' ? 'default' :
                            request.status === 'approved' ? 'secondary' :
                            'outline'
                          }>
                            {request.status === 'completed' ? 'Paid' : 
                             request.status === 'paid' ? 'Paid' : 
                             request.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
            Back to Dashboard
          </Button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Withdraw;
