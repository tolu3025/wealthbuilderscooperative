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

      // Find profile by email and PIN
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', formData.email)
        .eq('registration_pin', formData.pin)
        .eq('registration_status', 'pending_activation')
        .single();

      if (profileError || !profile) {
        throw new Error("Invalid PIN or email. Please check and try again.");
      }

      // Generate member number
      const { data: memberNumberData, error: memberNumberError } = await supabase
        .rpc('generate_member_number');

      if (memberNumberError) throw memberNumberError;

      // Activate account
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          registration_status: 'active',
          member_number: memberNumberData,
          registration_pin: null, // Clear the PIN for security
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      toast({
        title: "Account activated! 🎉",
        description: `Your member number is ${memberNumberData}. Please login to continue.`,
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 2000);

    } catch (error: any) {
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
                Enter your email and the PIN sent to you via WhatsApp
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
