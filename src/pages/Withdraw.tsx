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
  const [monthsContributed, setMonthsContributed] = useState(0);
  const [requests, setRequests] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    amount: "",
    accountName: "",
    accountNumber: "",
    bankName: "",
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
          title: "Account Not Activated",
          description: "Please activate your account before requesting withdrawals.",
          variant: "destructive",
        });
        navigate("/activate");
        return;
      }
      
      setProfile(profileData);

      // Fetch member balance
      const { data: balance } = await supabase
        .from('member_balances')
        .select('*')
        .eq('member_id', profileData.id)
        .single();

      const savings = balance?.total_savings || 0;
      const months = balance?.months_contributed || 0;
      
      setTotalSavings(savings);
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

      if (monthsContributed < 6) {
        throw new Error("You must contribute for at least 6 months before withdrawing");
      }

      if (amount > totalSavings) {
        throw new Error("Insufficient savings balance");
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

  const isEligible = monthsContributed >= 6;

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Request Withdrawal</h1>
            <p className="text-muted-foreground">Withdraw from your savings balance</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  ₦{totalSavings.toLocaleString()}
                </div>
              </CardContent>
            </Card>

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
                You must contribute for at least 6 months before you can request a withdrawal.
                You have contributed for {monthsContributed} month(s).
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
                  <Label htmlFor="amount">Amount (₦)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    max={totalSavings}
                    disabled={!isEligible}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Available: ₦{totalSavings.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input
                    id="accountName"
                    placeholder="Enter account name"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    disabled={!isEligible}
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
                    disabled={!isEligible}
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
                    disabled={!isEligible}
                    required
                  />
                </div>

                <Button type="submit" disabled={!isEligible || submitting} className="w-full" size="lg">
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
                        <TableCell>₦{request.amount.toLocaleString()}</TableCell>
                        <TableCell>{request.bank_name}</TableCell>
                        <TableCell>
                          <Badge variant={
                            request.status === 'paid' ? 'default' :
                            request.status === 'approved' ? 'secondary' :
                            'outline'
                          }>
                            {request.status}
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
