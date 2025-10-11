import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MemberSidebar } from "@/components/MemberSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

interface Dividend {
  id: string;
  amount: number;
  distribution_date: string;
  status: string;
  dividend_percentage: number;
  property_name: string | null;
}

const Dividends = () => {
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarned, setTotalEarned] = useState(0);
  const [userName, setUserName] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchDividends();
  }, []);

  const fetchDividends = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setUserName(`${profile.first_name} ${profile.last_name}`);

        const { data: dividendsData, error } = await supabase
          .from('dividends')
          .select('*')
          .eq('member_id', profile.id)
          .order('distribution_date', { ascending: false });

        if (error) throw error;

        setDividends(dividendsData || []);
        const total = dividendsData?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;
        setTotalEarned(total);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <MemberSidebar />
          <div className="flex-1 flex flex-col">
            <DashboardHeader userName={userName} />
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <MemberSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader userName={userName} />
          <main className="flex-1 p-6 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dividend History</h1>
              <p className="text-muted-foreground">
                Track your dividend earnings from property sales
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Dividends are distributed after property resales based on your capital contribution.
                You must have ≥₦50,000 capital and 6+ months membership to qualify.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-l-4 border-l-primary">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Dividends Earned
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">
                    ₦{totalEarned.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-secondary">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Distributions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-secondary">
                    {dividends.length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Dividend Records
                </CardTitle>
                <CardDescription>
                  History of all your dividend payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dividends.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No dividends received yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Keep contributing to reach eligibility
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Share %</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dividends.map((dividend) => (
                        <TableRow key={dividend.id}>
                          <TableCell>
                            {new Date(dividend.distribution_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {dividend.property_name || "Property Sale"}
                          </TableCell>
                          <TableCell>
                            {dividend.dividend_percentage?.toFixed(2)}%
                          </TableCell>
                          <TableCell className="font-semibold">
                            ₦{Number(dividend.amount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={dividend.status === 'paid' ? 'default' : 'secondary'}
                            >
                              {dividend.status}
                            </Badge>
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
