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
import { Wallet, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
  const [includeProjectSupport, setIncludeProjectSupport] = useState(false);
  const [projectSupportReceipt, setProjectSupportReceipt] = useState<string>("");

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
    if (isNaN(amount) || amount < 5000) {
      toast({
        title: "Invalid amount",
        description: "Minimum contribution is ₦5,000",
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

      // Insert main contribution
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

      // If project support is included, insert separate record
      if (includeProjectSupport && projectSupportReceipt) {
        const { error: projectError } = await supabase
          .from('project_support_contributions')
          .insert({
            member_id: profile.id,
            amount: 500,
            receipt_url: projectSupportReceipt,
            contribution_month: currentMonth,
            payment_status: 'pending',
          });

        if (projectError) throw projectError;
      }

      toast({
        title: "Contribution submitted",
        description: includeProjectSupport 
          ? "Your contribution and project support have been submitted for admin approval"
          : "Your contribution has been submitted for admin approval",
      });

      setReceiptUrl("");
      setProjectSupportReceipt("");
      setIncludeProjectSupport(false);
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
  
  // Calculate live preview
  const amount = parseFloat(contributionAmount) || 0;
  const projectSupport = includeProjectSupport ? 500 : 0;
  const contributable = amount;
  const capitalAmount = selectedBreakdown === '100_capital' ? contributable : contributable * 0.8;
  const savingsAmount = selectedBreakdown === '100_capital' ? 0 : contributable * 0.2;
  const totalAmount = amount + projectSupport;
  
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

          {isActingMember && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                As an <strong>Acting Member</strong>, your monthly contribution is ₦500. You are not eligible for dividend distributions.
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

              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={includeProjectSupport}
                    onChange={(e) => setIncludeProjectSupport(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Add Project Support Fund (₦500)</span>
                </label>
                {includeProjectSupport && (
                  <div className="pl-6 space-y-2">
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload separate receipt for project support payment
                    </p>
                    <FileUpload
                      onUploadComplete={setProjectSupportReceipt}
                      userId={user?.id || ''}
                      fileType="project-support"
                    />
                  </div>
                )}
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Live Preview:</strong>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>Contribution:</span>
                      <span className="font-medium">₦{amount.toLocaleString()}</span>
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
                    {includeProjectSupport && (
                      <div className="flex justify-between">
                        <span>Project Support (Optional):</span>
                        <span className="font-medium">₦{projectSupport.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1 mt-2">
                      <span className="font-bold">Total:</span>
                      <span className="font-bold">₦{totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Submit Your Contribution
              </CardTitle>
              <CardDescription>
                Upload proof of payment after making your contribution
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
                disabled={!receiptUrl || submitting || (includeProjectSupport && !projectSupportReceipt)}
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
