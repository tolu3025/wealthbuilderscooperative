import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const activateSchema = z.object({
  email: z.string().email("Invalid email address"),
  pin: z.string().length(6, "PIN must be 6 digits"),
});

const Activate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    pin: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      activateSchema.parse(formData);
      setLoading(true);

      // First, find profile by email only to check if it exists
      const { data: profileCheck, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id, registration_pin, registration_status, email')
        .eq('email', formData.email)
        .maybeSingle();

      if (profileCheckError) throw profileCheckError;

      if (!profileCheck) {
        throw new Error("No account found with this email address.");
      }

      // Validate PIN matches this specific user
      if (profileCheck.registration_pin !== formData.pin) {
        throw new Error("Invalid PIN. Please check the PIN sent to you.");
      }

      // Check registration status
      if (profileCheck.registration_status !== 'pending_activation') {
        if (profileCheck.registration_status === 'active') {
          throw new Error("This account is already activated. Please login.");
        }
        throw new Error("This account is not ready for activation. Please contact support.");
      }

      // Generate member number
      const { data: memberNumberData, error: memberNumberError } = await supabase
        .rpc('generate_member_number');

      if (memberNumberError) {
        console.error('Member number generation error:', memberNumberError);
        throw new Error("Failed to generate member number. Please try again.");
      }

      if (!memberNumberData) {
        throw new Error("Failed to generate member number. Please try again.");
      }

      // Activate account with all necessary updates
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          registration_status: 'active',
          member_number: memberNumberData,
          registration_pin: null, // Clear the PIN for security
        })
        .eq('id', profileCheck.id)
        .select()
        .single();

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error("Failed to activate account. Please try again.");
      }

      console.log('Account activated successfully:', updatedProfile);

      toast({
        title: "Account activated! 🎉",
        description: `Your member number is ${memberNumberData}. Please login to continue.`,
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);

    } catch (error: any) {
      console.error('Activation error:', error);
      toast({
        title: "Activation failed",
        description: error.message || "Could not activate your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pt-16 md:pt-20">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card className="border-border shadow-elegant">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-3xl font-bold">Activate Your Account</CardTitle>
              <CardDescription>
                Enter your email and the PIN sent to you via WhatsApp (+234 803 374 0309)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
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
                  <Label htmlFor="pin">6-Digit PIN</Label>
                  <Input
                    id="pin"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={formData.pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, pin: value });
                    }}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Activating..." : "Activate Account"}
                </Button>

                <p className="text-sm text-muted-foreground text-center">
                  Don't have a PIN yet?{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/register")}>
                    Register here
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

export default Activate;
