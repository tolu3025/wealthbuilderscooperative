import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Building2, Users, Briefcase, UserCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MemberSidebar } from "@/components/MemberSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

interface PropertyPlan {
  id: string;
  name: string;
  description: string;
  plan_type: string;
}

interface Enrollment {
  id: string;
  plan_id: string;
  enrolled_at: string;
  status: string;
}

const planIcons = {
  joint_ownership: Building2,
  individual_ownership: Users,
  property_business: Briefcase,
  reseller: UserCheck,
};

const PropertyPlans = () => {
  const [plans, setPlans] = useState<PropertyPlan[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [monthsActive, setMonthsActive] = useState(0);
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserName(`${profile.first_name} ${profile.last_name}`);

        // Check eligibility (3 months + ₦50,000 capital for plans)
        const { data: balance } = await supabase
          .from('member_balances')
          .select('months_contributed, total_capital, eligible_for_dividend')
          .eq('member_id', profile.id)
          .single();

        const months = balance?.months_contributed || 0;
        const capital = balance?.total_capital || 0;
        setMonthsActive(months);
        // Eligible if: 3+ months AND ₦50,000+ capital (1 share)
        setEligible(balance?.eligible_for_dividend || false);

        // Fetch enrollments
        const { data: enrollmentData } = await supabase
          .from('plan_enrollments')
          .select('*')
          .eq('member_id', profile.id);

        setEnrollments(enrollmentData || []);
      }

      // Fetch plans
      const { data: plansData } = await supabase
        .from('property_plans')
        .select('*')
        .order('created_at');

      setPlans(plansData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (planId: string) => {
    if (!eligible) {
      toast.error("You must have contributed for at least 3 months and reached ₦50,000 capital before joining a plan.");
      return;
    }

    setEnrolling(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      const { error } = await supabase
        .from('plan_enrollments')
        .insert({
          member_id: profile.id,
          plan_id: planId,
          status: 'active',
        });

      if (error) throw error;

      toast.success("Successfully applied to plan!");
      fetchData();
    } catch (error: any) {
      console.error('Enrollment error:', error);
      toast.error("Failed to apply: " + error.message);
    } finally {
      setEnrolling(null);
    }
  };

  const handleCancelInterest = async (planId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Find the enrollment to delete
      const enrollment = enrollments.find(e => e.plan_id === planId && e.status === 'active');
      if (!enrollment) return;

      const { error } = await supabase
        .from('plan_enrollments')
        .delete()
        .eq('id', enrollment.id);

      if (error) throw error;

      toast.success("Interest cancelled successfully!");
      fetchData();
    } catch (error: any) {
      console.error('Cancel error:', error);
      toast.error("Failed to cancel: " + error.message);
    }
  };

  const isEnrolled = (planId: string) => {
    return enrollments.some(e => e.plan_id === planId && e.status === 'active');
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <MemberSidebar />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <MemberSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader userName={userName} />
          <main className="flex-1 p-6 space-y-6 overflow-auto">
            <div>
              <h1 className="text-3xl font-bold mb-2">Property Investment Plans</h1>
              <p className="text-muted-foreground">
                Choose from our available property investment opportunities
              </p>
            </div>

            {!eligible && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You must have contributed for at least 3 months and reached ₦50,000 capital before joining a plan.
                  <br />
                  <strong>Current status:</strong> {monthsActive} month{monthsActive !== 1 ? 's' : ''} active
                </AlertDescription>
              </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {plans.map((plan) => {
                const Icon = planIcons[plan.plan_type as keyof typeof planIcons] || Building2;
                const enrolled = isEnrolled(plan.id);

                return (
                  <Card key={plan.id} className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{plan.name}</CardTitle>
                          </div>
                        </div>
                        {enrolled && (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Enrolled
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <CardDescription className="text-base">
                        {plan.description}
                      </CardDescription>
                      
                      {enrolled ? (
                        <Button
                          onClick={() => handleCancelInterest(plan.id)}
                          variant="outline"
                          className="w-full"
                        >
                          Cancel Interest
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleEnroll(plan.id)}
                          disabled={!eligible || enrolling === plan.id}
                          className="w-full"
                        >
                          {enrolling === plan.id && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {eligible ? "Apply" : "Not Eligible Yet"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PropertyPlans;
