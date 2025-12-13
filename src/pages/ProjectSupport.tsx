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
import { Wallet, Info, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CopyPhoneButton } from "@/components/CopyPhoneButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PaymentWarningBanner } from "@/components/PaymentWarningBanner";

const ProjectSupport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projectSupportReceipt, setProjectSupportReceipt] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [psfSubmitted, setPsfSubmitted] = useState(false);
  const [psfHistory, setPsfHistory] = useState<any[]>([]);

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

      // Check if PSF already submitted for current month
      const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7) + '-01';
      const { data: psfData } = await supabase
        .from('project_support_contributions')
        .select('id')
        .eq('member_id', profileData.id)
        .eq('contribution_month', currentMonth)
        .limit(1);
      
      if (psfData && psfData.length > 0) {
        setPsfSubmitted(true);
      }

      // Fetch PSF history
      const { data: historyData } = await supabase
        .from('project_support_contributions')
        .select('*')
        .eq('member_id', profileData.id)
        .order('created_at', { ascending: false });

      setPsfHistory(historyData || []);

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

  const handleProjectSupportSubmit = async () => {
    if (!projectSupportReceipt || !profile) return;

    setSubmitting(true);
    try {
      const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7) + '-01';

      // Insert project support contribution
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

      toast({
        title: "Project Support submitted",
        description: "Your project support contribution has been submitted for admin approval",
      });

      setProjectSupportReceipt("");
      setPsfSubmitted(true);
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
  
  // Calculate last Thursday of current month
  const getLastThursday = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    const dayOfWeek = lastDay.getDay();
    const daysUntilThursday = (dayOfWeek + 3) % 7;
    return new Date(year, month, lastDay.getDate() - daysUntilThursday);
  };
  
  const lastThursday = getLastThursday(new Date());
  const lastThursdayFormatted = lastThursday.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Project Support Fund</h1>
            <p className="text-muted-foreground">Monthly mandatory payment for {currentMonth}</p>
          </div>

          <PaymentWarningBanner />

          <Alert className="border-red-500/50 bg-red-50 dark:bg-red-950/20">
            <Info className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900 dark:text-red-100">
              <strong className="text-red-700 dark:text-red-300">⚠️ MANDATORY: Project Support Fund</strong>
              <div className="mt-2 space-y-1 text-sm">
                <p>The ₦500 Project Support Fund is <strong>compulsory</strong> for all members.</p>
                <p className="font-semibold">⏰ Deadline: {lastThursdayFormatted} (Last Thursday of the month)</p>
                <p className="text-red-700 dark:text-red-300">
                  ⚠️ Members who don't pay by the deadline will NOT receive Real Estate Bonus earnings for that month.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {psfSubmitted && (
            <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900 dark:text-green-100">
                <strong>Submitted!</strong> Your Project Support Fund payment for this month has been submitted and is pending admin approval.
              </AlertDescription>
            </Alert>
          )}

          <Card className="border-2 border-red-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-red-600" />
                Project Support Fund (₦500)
              </CardTitle>
              <CardDescription>
                Required monthly payment - pay before last Thursday to remain eligible for Real Estate Bonus
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg space-y-3 border border-red-200 dark:border-red-800">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Bank Name</p>
                  <p className="font-semibold">Alpha Morgan Bank</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Account Number</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">2010006769</p>
                    <CopyPhoneButton phoneNumber="2010006769" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Account Name</p>
                  <p className="font-semibold text-sm">WEALTH BUILDERS IN PROPERTIES MULTIPURPOSE COOPERATIVE LTD</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Amount (Fixed)</p>
                  <p className="font-semibold text-lg text-red-600">₦500</p>
                </div>
                <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                  * This is a separate mandatory payment from your monthly contribution
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Upload Project Support Receipt *</label>
                <FileUpload
                  onUploadComplete={setProjectSupportReceipt}
                  userId={user?.id || ""}
                  fileType="project-support"
                  bucket="payment-receipts"
                />
              </div>

              <Button
                onClick={handleProjectSupportSubmit}
                disabled={psfSubmitted || !projectSupportReceipt || submitting}
                className={`w-full ${psfSubmitted ? 'bg-green-600 hover:bg-green-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                size="lg"
              >
                {psfSubmitted ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Submitted for This Month
                  </>
                ) : submitting ? (
                  "Submitting..."
                ) : (
                  "Submit Project Support Payment"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* PSF History */}
          {psfHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Your project support fund payment history</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {psfHistory.map((psf) => (
                      <TableRow key={psf.id}>
                        <TableCell>
                          {new Date(psf.contribution_month).toLocaleDateString('en-US', { 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </TableCell>
                        <TableCell>₦{psf.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={
                            psf.payment_status === 'approved' ? 'default' :
                            psf.payment_status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {psf.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(psf.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProjectSupport;
