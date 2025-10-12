import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const registerSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(10, "Address must be at least 10 characters"),
  state: z.string().min(1, "Please select a state"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  breakdownType: z.enum(["80_20", "100_capital"]),
  inviteCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [showUpload, setShowUpload] = useState(false);
  
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      state: "",
      password: "",
      confirmPassword: "",
      breakdownType: "80_20",
      inviteCode: "",
    },
  });

  // Auto-populate invite code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      form.setValue('inviteCode', refCode.toUpperCase());
    }
  }, []);

  const handleCreateAccount = async (data: RegisterFormData) => {
    setLoading(true);
    
    try {
      // Create user account first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone,
            state: data.state,
            address: data.address,
            breakdown_type: data.breakdownType,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Wait for profile to be created
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Update profile with additional data and handle referrals
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', authData.user.id)
          .single();

        if (profile) {
          // Handle invite code if provided
          let invitedById = null;
          if (data.inviteCode) {
            const { data: referrer, error: referrerError } = await supabase
              .from('profiles')
              .select('id, state')
              .eq('invite_code', data.inviteCode.toUpperCase())
              .single();

            if (referrer) {
              invitedById = referrer.id;
              
              // Create referral commission for the inviter (₦500)
              await supabase
                .from('commissions')
                .insert({
                  member_id: referrer.id,
                  invited_member_id: profile.id,
                  amount: 500,
                  commission_type: 'referral',
                  status: 'pending'
                });

              // Get referrer's user_id for notification
              const { data: referrerProfile } = await supabase
                .from('profiles')
                .select('user_id, first_name, last_name')
                .eq('id', referrer.id)
                .single();

              if (referrerProfile?.user_id) {
                // Send notification to referrer
                await supabase
                  .from('notifications')
                  .insert({
                    user_id: referrerProfile.user_id,
                    title: 'New Referral!',
                    message: `${data.firstName} ${data.lastName} just joined using your referral code. You've earned ₦500!`,
                    type: 'referral',
                    related_id: profile.id
                  });
              }

              // Create state rep commission if they have a state rep (₦100)
              const { data: stateRep } = await supabase
                .from('state_representatives')
                .select('rep_profile_id')
                .eq('state', referrer.state)
                .single();

              if (stateRep?.rep_profile_id) {
                await supabase
                  .from('commissions')
                  .insert({
                    member_id: stateRep.rep_profile_id,
                    invited_member_id: profile.id,
                    amount: 100,
                    commission_type: 'state_rep',
                    status: 'pending'
                  });
              }
            }
          }

          await supabase
            .from('profiles')
            .update({
              address: data.address,
              breakdown_type: data.breakdownType,
              invited_by: invitedById,
            })
            .eq('id', profile.id);
        }

        toast({
          title: "Account created!",
          description: "Redirecting to upload payment receipt...",
        });

        // Redirect to upload receipt page
        setTimeout(() => {
          navigate("/register/upload-receipt");
        }, 1500);
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

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateAccount)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your first name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="your.email@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input type="tel" placeholder="+234 xxx xxx xxxx" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Home Address *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full address (min. 10 characters)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State of Residence *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {NIGERIAN_STATES.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="breakdownType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Monthly Contribution Breakdown *</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="space-y-2"
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
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password *</FormLabel>
                          <FormControl>
                            <Input 
                              type="password"
                              placeholder="Create a secure password (min. 8 characters)" 
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password *</FormLabel>
                          <FormControl>
                            <Input 
                              type="password"
                              placeholder="Re-enter your password" 
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="inviteCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invite Code (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter invite code if you have one" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Creating Account..." : "Continue to Payment Upload"}
                  </Button>

                  <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/login")}>
                    Login here
                  </Button>
                  </p>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Register;
