import { useState } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search } from "lucide-react";

const MemberBalanceAdjustment = () => {
  const [email, setEmail] = useState("kunle@gmail.com");
  const [totalCapital, setTotalCapital] = useState("50000");
  const [monthsContributed, setMonthsContributed] = useState("3");
  const [loading, setLoading] = useState(false);
  const [memberInfo, setMemberInfo] = useState<any>(null);

  const searchMember = async () => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          first_name,
          last_name,
          member_balances (
            total_capital,
            months_contributed,
            eligible_for_dividend
          )
        `)
        .ilike("email", email)
        .single();

      if (error) throw error;
      setMemberInfo(profile);
      toast.success("Member found");
    } catch (error: any) {
      toast.error("Member not found: " + error.message);
      setMemberInfo(null);
    }
  };

  const updateBalance = async () => {
    if (!memberInfo) {
      toast.error("Please search for a member first");
      return;
    }

    setLoading(true);
    try {
      const capitalValue = parseFloat(totalCapital);
      const monthsValue = parseInt(monthsContributed);
      
      const eligibleForDividend = monthsValue >= 3 && capitalValue >= 50000;

      const { error } = await supabase
        .from("member_balances")
        .update({
          total_capital: capitalValue,
          months_contributed: monthsValue,
          eligible_for_dividend: eligibleForDividend,
          updated_at: new Date().toISOString(),
        })
        .eq("member_id", memberInfo.id);

      if (error) throw error;

      toast.success(`Updated ${memberInfo.first_name} ${memberInfo.last_name}'s balance`);
      searchMember(); // Refresh data
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Member Balance Adjustment</h1>
              <p className="text-muted-foreground mt-2">Manually adjust member balances for testing or corrections</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Search Member</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="email">Member Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter member email"
                    />
                  </div>
                  <Button onClick={searchMember} className="mt-8">
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </Button>
                </div>

                {memberInfo && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold">Current Member Info:</h3>
                    <p>Name: {memberInfo.first_name} {memberInfo.last_name}</p>
                    <p>Email: {memberInfo.email}</p>
                    <p>Current Capital: ₦{memberInfo.member_balances?.[0]?.total_capital?.toLocaleString() || 0}</p>
                    <p>Months Contributed: {memberInfo.member_balances?.[0]?.months_contributed || 0}</p>
                    <p>Eligible for Dividend: {memberInfo.member_balances?.[0]?.eligible_for_dividend ? "Yes" : "No"}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {memberInfo && (
              <Card>
                <CardHeader>
                  <CardTitle>Update Balance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="capital">Total Capital (₦)</Label>
                    <Input
                      id="capital"
                      type="number"
                      value={totalCapital}
                      onChange={(e) => setTotalCapital(e.target.value)}
                      placeholder="Enter capital amount"
                    />
                  </div>

                  <div>
                    <Label htmlFor="months">Months Contributed</Label>
                    <Input
                      id="months"
                      type="number"
                      value={monthsContributed}
                      onChange={(e) => setMonthsContributed(e.target.value)}
                      placeholder="Enter months"
                    />
                  </div>

                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm">
                      <strong>Eligibility Check:</strong> Member will be eligible for dividends if capital ≥ ₦50,000 AND months ≥ 3
                    </p>
                    <p className="text-sm mt-1">
                      Based on inputs: <strong>{parseInt(monthsContributed) >= 3 && parseFloat(totalCapital) >= 50000 ? "✅ ELIGIBLE" : "❌ NOT ELIGIBLE"}</strong>
                    </p>
                  </div>

                  <Button onClick={updateBalance} disabled={loading} className="w-full">
                    {loading ? "Updating..." : "Update Balance"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MemberBalanceAdjustment;
