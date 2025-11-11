import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

const Dividends = () => {
  const [distributions, setDistributions] = useState<any[]>([]);
  const [dividendProfit, setDividendProfit] = useState("");
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: distributionsData } = await supabase
        .from('dividend_distributions')
        .select('*')
        .order('created_at', { ascending: false });
      setDistributions(distributionsData || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDistribution = async (distributionId: string) => {
    try {
      // First delete all dividends associated with this distribution
      const { error: dividendsError } = await supabase
        .from('dividends')
        .delete()
        .eq('distribution_id', distributionId);

      if (dividendsError) throw dividendsError;

      // Then delete the distribution itself
      const { error: distError } = await supabase
        .from('dividend_distributions')
        .delete()
        .eq('id', distributionId);

      if (distError) throw distError;

      toast.success("Distribution deleted successfully");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDividendDistribution = async () => {
    if (!dividendProfit) {
      toast.error("Please enter profit amount");
      return;
    }

    setCalculating(true);
    try {
      const { data: members } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, member_number');

      if (!members) return;

      // Get member balances - must have ≥₦50,000 capital AND ≥3 months contributions
      // Exclude acting members (only contributors are eligible)
      const { data: balances } = await supabase
        .from('member_balances')
        .select(`
          member_id, 
          total_capital, 
          months_contributed, 
          eligible_for_dividend,
          profiles!inner(member_type)
        `)
        .gte('total_capital', 50000)
        .gte('months_contributed', 3)
        .eq('profiles.member_type', 'contributor');

      if (!balances || balances.length === 0) {
        toast.error("No eligible contributors found. Members need BOTH ₦50,000+ capital AND 3+ months of contributions.");
        setCalculating(false);
        return;
      }

      // Filter members who are in the eligible list and are contributors
      const eligibleMembers = members
        .filter(member => 
          balances.some(balance => 
            balance.member_id === member.id && 
            balance.eligible_for_dividend === true
          )
        )
        .map(member => {
          const balance = balances.find(b => b.member_id === member.id);
          return {
            ...member,
            totalCapital: Number(balance?.total_capital || 0)
          };
        });

      if (eligibleMembers.length === 0) {
        toast.error("No eligible members found.");
        setCalculating(false);
        return;
      }
      const totalEligibleCapital = eligibleMembers.reduce((sum, m) => sum + (m?.totalCapital || 0), 0);

      const { data: distribution, error: distError } = await supabase
        .from('dividend_distributions')
        .insert([{
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
          status: 'calculated'
        };
      });

      const { error: divError } = await supabase
        .from('dividends')
        .insert(dividendInserts);

      if (divError) throw divError;

      toast.success(`Dividends calculated for ${eligibleMembers.length} eligible members`);
      setDividendProfit("");
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
                Calculate and distribute dividends to eligible contributors (acting members excluded)
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>New Dividend Distribution</CardTitle>
                <CardDescription>
                  Enter profit to calculate member dividends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Total Profit (₦)</Label>
                  <Input
                    type="number"
                    placeholder="Enter profit amount"
                    value={dividendProfit}
                    onChange={(e) => setDividendProfit(e.target.value)}
                  />
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
                        <TableHead>Total Profit</TableHead>
                        <TableHead>Capital Pool</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distributions.map((dist: any) => (
                        <TableRow key={dist.id}>
                          <TableCell>₦{Number(dist.total_profit).toLocaleString()}</TableCell>
                          <TableCell>₦{Number(dist.total_capital_pool).toLocaleString()}</TableCell>
                          <TableCell>{dist.eligible_members_count}</TableCell>
                          <TableCell>{new Date(dist.distribution_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge>{dist.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Distribution?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete this dividend distribution and all associated member dividends. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteDistribution(dist.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
