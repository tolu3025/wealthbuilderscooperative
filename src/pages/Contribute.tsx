import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Info, Loader2, CreditCard, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CopyPhoneButton } from "@/components/CopyPhoneButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PaymentWarningBanner } from "@/components/PaymentWarningBanner";

const Contribute = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [contributionAmount, setContributionAmount] = useState<string>("5000");
  const [selectedBreakdown, setSelectedBreakdown] = useState<string>("80_20");

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
      setSelectedBreakdown(profileData.breakdown_type || '80_20');

      // Fetch contribution history
      const { data: contribData, error: contribError } = await supabase
        .from('contributions')
        .select('*')
        .eq('member_id', profileData.id)
        .order('created_at', { ascending: false });

      if (contribError) throw contribError;
      setContributions(contribData || []);

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

  const handleSubmit = async () => {
    if (!receiptUrl || !profile) return;

    const amount = parseFloat(contributionAmount);
    if (isNaN(amount) || amount < minAmount) {
      toast({
        title: "Invalid amount",
        description: `Minimum contribution is ₦${minAmount.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7) + '-01';
      const contributable = amount;
      
      let capitalAmount, savingsAmount;
      if (selectedBreakdown === '100_capital') {
        capitalAmount = contributable;
        savingsAmount = 0;
      } else {
        capitalAmount = contributable * 0.8;
        savingsAmount = contributable * 0.2;
      }

      // Insert main contribution only
      const { error } = await supabase
        .from('contributions')
        .insert({
          member_id: profile.id,
          amount: amount,
          capital_amount: capitalAmount,
          savings_amount: savingsAmount,
          project_support_amount: 0,
          breakdown_type: selectedBreakdown,
          contribution_month: currentMonth,
          receipt_url: receiptUrl,
          payment_status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "Contribution submitted",
        description: "Your contribution has been submitted for admin approval",
      });

      setReceiptUrl("");
      fetchData();

    } catch (error: any) {
      toast({
        title: "Submission failed",
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

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Calculate live preview for contribution only
  const amount = parseFloat(contributionAmount) || 0;
  const contributable = amount;
  const capitalAmount = selectedBreakdown === '100_capital' ? contributable : contributable * 0.8;
  const savingsAmount = selectedBreakdown === '100_capital' ? 0 : contributable * 0.2;
  
  // Check if acting member
  const isActingMember = profile?.member_type === 'acting_member';
  const minAmount = isActingMember ? 500 : 5000;

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Make a Contribution</h1>
            <p className="text-muted-foreground">Submit your monthly contribution for {currentMonth}</p>
          </div>

          <PaymentWarningBanner />

          {isActingMember && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                As an <strong>Acting Member</strong>, your monthly contribution is ₦500.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Contribution Amount</CardTitle>
              <CardDescription>
                {isActingMember 
                  ? "Enter your contribution amount (minimum ₦500 for acting members)"
                  : "Enter your contribution amount (minimum ₦5,000)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Amount (₦)</label>
                <input
                  type="number"
                  min={minAmount}
                  step="100"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder={minAmount.toString()}
                />
              </div>

              {!isActingMember && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Split Type</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="80_20"
                        checked={selectedBreakdown === '80_20'}
                        onChange={(e) => setSelectedBreakdown(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span>80% Capital / 20% Savings</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value="100_capital"
                        checked={selectedBreakdown === '100_capital'}
                        onChange={(e) => setSelectedBreakdown(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span>100% Capital</span>
                    </label>
                  </div>
                </div>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Breakdown:</strong>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>Contribution Amount:</span>
                      <span className="text-primary">₦{amount.toLocaleString()}</span>
                    </div>
                    {!isActingMember && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>└ Capital:</span>
                          <span>₦{capitalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>└ Savings:</span>
                          <span>₦{savingsAmount.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Monthly Contribution Account
              </CardTitle>
              <CardDescription>
                Pay your ₦5,000 monthly contribution to this account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Bank Name</p>
                  <p className="font-semibold">FCMB</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Account Number</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">1042529824</p>
                    <CopyPhoneButton phoneNumber="1042529824" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Account Name</p>
                  <p className="font-semibold text-sm">ORISUNBARE (OSG) WEALTH BUILDERS IN PROPT MCSL</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Upload Contribution Receipt
              </CardTitle>
              <CardDescription>
                Upload your payment receipt for the monthly contribution
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                onUploadComplete={setReceiptUrl}
                userId={user?.id || ''}
                fileType="contribution"
              />

              <Button
                onClick={handleSubmit}
                disabled={!receiptUrl || submitting}
                className="w-full"
                size="lg"
              >
                {submitting ? "Submitting..." : "Submit Contribution"}
              </Button>
            </CardContent>
          </Card>



          <Card>
            <CardHeader>
              <CardTitle>Contribution History</CardTitle>
              <CardDescription>Your past contributions and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {contributions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No contributions yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contributions.map((contrib) => (
                      <TableRow key={contrib.id}>
                        <TableCell>
                          {new Date(contrib.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {contrib.contribution_month ? 
                            new Date(contrib.contribution_month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                            : 'N/A'}
                        </TableCell>
                        <TableCell>₦{contrib.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={contrib.payment_status === 'approved' ? 'default' : 'secondary'}>
                            {contrib.payment_status}
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

export default Contribute;
