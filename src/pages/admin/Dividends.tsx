import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

const Dividends = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [dividendProfit, setDividendProfit] = useState("");
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      setProperties(propertiesData || []);

      const { data: distributionsData } = await supabase
        .from('dividend_distributions')
        .select(`
          *,
          properties(name)
        `)
        .order('created_at', { ascending: false });
      setDistributions(distributionsData || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDividendDistribution = async () => {
    if (!dividendProfit || !selectedProperty) {
      toast.error("Please enter profit amount and select property");
      return;
    }

    setCalculating(true);
    try {
      const { data: members } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, member_number');

      if (!members) return;

      const memberCapitals = await Promise.all(
        members.map(async (member) => {
          const { data: contribs } = await supabase
            .from('contributions')
            .select('capital_amount')
            .eq('member_id', member.id)
            .eq('payment_status', 'approved');

          const totalCapital = contribs?.reduce((sum, c) => sum + Number(c.capital_amount), 0) || 0;
          return totalCapital >= 50000 ? { ...member, totalCapital } : null;
        })
      );

      const eligibleMembers = memberCapitals.filter(Boolean);
      const totalEligibleCapital = eligibleMembers.reduce((sum, m) => sum + (m?.totalCapital || 0), 0);

      const { data: distribution, error: distError } = await supabase
        .from('dividend_distributions')
        .insert([{
          property_id: selectedProperty,
          total_profit: parseFloat(dividendProfit),
          total_capital_pool: totalEligibleCapital,
          eligible_members_count: eligibleMembers.length,
          status: 'calculated'
        }])
        .select()
        .single();

      if (distError) throw distError;

      const dividendInserts = eligibleMembers.map(member => {
        const memberShare = (member!.totalCapital / totalEligibleCapital) * parseFloat(dividendProfit);
        const percentage = (member!.totalCapital / totalEligibleCapital) * 100;

        return {
          member_id: member!.id,
          distribution_id: distribution.id,
          amount: memberShare,
          dividend_percentage: percentage,
          member_capital_at_distribution: member!.totalCapital,
          status: 'pending'
        };
      });

      const { error: divError } = await supabase
        .from('dividends')
        .insert(dividendInserts);

      if (divError) throw divError;

      toast.success(`Dividends calculated for ${eligibleMembers.length} eligible members`);
      setDividendProfit("");
      setSelectedProperty("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AdminSidebar />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader userName="Admin" />
          <main className="flex-1 p-6 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dividend Distribution</h1>
              <p className="text-muted-foreground">
                Calculate and distribute dividends to eligible members
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>New Dividend Distribution</CardTitle>
                <CardDescription>
                  Enter property sale profit to calculate member dividends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Property</Label>
                    <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose property" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map((prop) => (
                          <SelectItem key={prop.id} value={prop.id}>
                            {prop.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Total Profit (₦)</Label>
                    <Input
                      type="number"
                      placeholder="Enter profit amount"
                      value={dividendProfit}
                      onChange={(e) => setDividendProfit(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleDividendDistribution}
                  disabled={calculating}
                  className="w-full"
                >
                  {calculating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Calculate & Distribute Dividends
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribution History</CardTitle>
              </CardHeader>
              <CardContent>
                {distributions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No distributions yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Total Profit</TableHead>
                        <TableHead>Capital Pool</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distributions.map((dist: any) => (
                        <TableRow key={dist.id}>
                          <TableCell className="font-medium">{dist.properties?.name}</TableCell>
                          <TableCell>₦{Number(dist.total_profit).toLocaleString()}</TableCell>
                          <TableCell>₦{Number(dist.total_capital_pool).toLocaleString()}</TableCell>
                          <TableCell>{dist.eligible_members_count}</TableCell>
                          <TableCell>{new Date(dist.distribution_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge>{dist.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dividends;
