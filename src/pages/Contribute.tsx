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

    setSubmitting(true);
    try {
      const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7) + '-01';
      const breakdownType = profile.breakdown_type || '80_20';
      
      // Calculate amounts based on breakdown
      const totalAmount = 5500;
      const projectSupport = 500;
      const remaining = 5000;
      
      let capitalAmount, savingsAmount;
      if (breakdownType === '100_capital') {
        capitalAmount = remaining;
        savingsAmount = 0;
      } else {
        capitalAmount = remaining * 0.8;
        savingsAmount = remaining * 0.2;
      }

      const { error } = await supabase
        .from('contributions')
        .insert({
          member_id: profile.id,
          amount: totalAmount,
          capital_amount: capitalAmount,
          savings_amount: savingsAmount,
          project_support_amount: projectSupport,
          breakdown_type: breakdownType,
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
  const breakdownType = profile?.breakdown_type || '80_20';

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Make a Contribution</h1>
            <p className="text-muted-foreground">Submit your monthly contribution for {currentMonth}</p>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Monthly Contribution: ₦5,500</strong>
              <br />
              Your breakdown: {breakdownType === '100_capital' ? '100% Capital (₦5,000)' : '80% Capital (₦4,000) / 20% Savings (₦1,000)'}
              <br />
              Plus ₦500 Project Support Fund
            </AlertDescription>
          </Alert>

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
