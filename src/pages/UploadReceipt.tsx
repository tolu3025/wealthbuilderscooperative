import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { Upload, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const UploadReceipt = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate("/register");
      return;
    }

    // Fetch profile to check registration status
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        toast({
          title: "Error",
          description: "Could not fetch profile. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setProfileData(data);

      // If already approved, redirect to dashboard
      if (data.registration_status === 'approved') {
        navigate("/dashboard");
      }
    };

    fetchProfile();
  }, [user, navigate, toast]);

  const handleCompleteRegistration = async () => {
    if (!receiptUrl) {
      toast({
        title: "Payment proof required",
        description: "Please upload your payment receipt",
        variant: "destructive",
      });
      return;
    }

    if (!profileData) {
      toast({
        title: "Error",
        description: "Profile data not found",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update profile status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          registration_status: 'pending_approval',
        })
        .eq('id', profileData.id);

      if (updateError) throw updateError;

      // Create registration fee record
      const { error: feeError } = await supabase
        .from('registration_fees')
        .insert({
          member_id: profileData.id,
          payment_receipt_url: receiptUrl,
          payment_date: new Date().toISOString(),
        });

      if (feeError) throw feeError;

      toast({
        title: "Registration submitted!",
        description: "Your registration has been submitted for approval. You'll receive a notification once your account is activated.",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Could not complete registration. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profileData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="border-border shadow-elegant">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold">Upload Payment Receipt</CardTitle>
              <CardDescription>
                Complete your registration by uploading proof of payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Registration Fee: ₦5,000</strong>
                  <br />
                  Please upload your payment receipt to verify your registration.
                  Your account will be activated within 24 hours after verification.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">Account Details:</p>
                  <p className="text-sm text-muted-foreground">
                    Name: {profileData.first_name} {profileData.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Email: {profileData.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Phone: {profileData.phone}
                  </p>
                </div>

                <FileUpload
                  onUploadComplete={setReceiptUrl}
                  userId={user.id}
                  fileType="registration"
                />

                <Button 
                  onClick={handleCompleteRegistration}
                  className="w-full" 
                  size="lg" 
                  disabled={loading || !receiptUrl}
                >
                  {loading ? "Submitting..." : "Complete Registration"}
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  Need help?{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/contact")}>
                    Contact Support
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default UploadReceipt;
