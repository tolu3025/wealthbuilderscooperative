import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { NIGERIAN_STATES } from "@/lib/nigerianStates";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";

const registerSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(10, "Address must be at least 10 characters"),
  state: z.string().min(1, "Please select a state"),
  breakdownType: z.enum(["80_20", "100_capital"]),
  inviteCode: z.string().optional(),
});

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [showUpload, setShowUpload] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    state: "",
    breakdownType: "80_20" as "80_20" | "100_capital",
    inviteCode: "",
  });

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      registerSchema.parse(formData);
      setLoading(true);

      // Create user account first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: Math.random().toString(36).slice(-8) + "Aa1!", // Temporary password
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            state: formData.state,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        setUserId(authData.user.id);
        setShowUpload(true);
        toast({
          title: "Account created!",
          description: "Now please upload your payment receipt to complete registration.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Account creation failed",
        description: error.message || "Could not create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async () => {
    if (!receiptUrl) {
      toast({
        title: "Payment proof required",
        description: "Please upload your payment receipt",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Wait a moment for profile to be created by trigger
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (profileError || !profile) {
        throw new Error("Failed to create profile");
      }

      // Update profile with additional data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          address: formData.address,
          breakdown_type: formData.breakdownType,
          registration_status: 'pending_approval',
          invited_by: formData.inviteCode ? null : null, // TODO: Look up inviter by code
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      // Create registration fee record
      const { error: feeError } = await supabase
        .from('registration_fees')
        .insert({
          member_id: profile.id,
          payment_receipt_url: receiptUrl,
          payment_date: new Date().toISOString(),
        });

      if (feeError) throw feeError;

      // Create commission records if invite code provided
      if (formData.inviteCode) {
        // TODO: Look up inviter and create commission records
      }

      toast({
        title: "Registration submitted!",
        description: "Your registration has been submitted for approval. You'll receive a PIN via WhatsApp within 24 hours.",
      });

      navigate("/");
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

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Card className="border-border shadow-elegant">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold">Become a Member</CardTitle>
              <CardDescription>
                Join WealthBuilders Cooperative and start building your financial future today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Registration Fee: ₦5,000</strong>
                  <br />
                  Pay to: WealthBuilders Cooperative
                  <br />
                  Bank: [Bank Name] | Account: [Account Number]
                </AlertDescription>
              </Alert>

              <form onSubmit={showUpload ? (e) => { e.preventDefault(); handleCompleteRegistration(); } : handleCreateAccount} className="space-y-6">
                {!showUpload && (
                  <>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          placeholder="Enter your first name"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          placeholder="Enter your last name"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+234 xxx xxx xxxx"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Home Address *</Label>
                      <Input
                        id="address"
                        placeholder="Enter your full address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">State of Residence *</Label>
                      <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your state" />
                        </SelectTrigger>
                        <SelectContent>
                          {NIGERIAN_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label>Monthly Contribution Breakdown *</Label>
                      <RadioGroup
                        value={formData.breakdownType}
                        onValueChange={(value) => setFormData({ ...formData, breakdownType: value as "80_20" | "100_capital" })}
                      >
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                          <RadioGroupItem value="80_20" id="80_20" />
                          <Label htmlFor="80_20" className="cursor-pointer flex-1">
                            <div className="font-medium">80% Capital / 20% Savings (Recommended)</div>
                            <div className="text-sm text-muted-foreground">₦4,000 capital + ₦1,000 savings</div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                          <RadioGroupItem value="100_capital" id="100_capital" />
                          <Label htmlFor="100_capital" className="cursor-pointer flex-1">
                            <div className="font-medium">100% Capital (Property Only)</div>
                            <div className="text-sm text-muted-foreground">₦5,000 full capital investment</div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="inviteCode">Invite Code (Optional)</Label>
                      <Input
                        id="inviteCode"
                        placeholder="Enter invite code if you have one"
                        value={formData.inviteCode}
                        onChange={(e) => setFormData({ ...formData, inviteCode: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                      {loading ? "Creating Account..." : "Continue to Payment Upload"}
                    </Button>
                  </>
                )}

                {showUpload && (
                  <>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Account created successfully! Now upload your payment receipt to complete your registration.
                      </AlertDescription>
                    </Alert>

                    <FileUpload
                      onUploadComplete={setReceiptUrl}
                      userId={userId}
                      fileType="registration"
                    />

                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg" 
                      disabled={loading || !receiptUrl}
                    >
                      {loading ? "Submitting..." : "Complete Registration"}
                    </Button>
                  </>
                )}

                <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/auth")}>
                    Login here
                  </Button>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Register;
