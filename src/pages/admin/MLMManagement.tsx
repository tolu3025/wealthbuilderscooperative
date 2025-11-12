import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, TrendingUp, DollarSign, Network } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SidebarProvider } from "@/components/ui/sidebar";

interface MLMTreeNode {
  id: string;
  member_id: string;
  parent_id: string | null;
  level: number;
  position: number;
  member_name: string;
  member_number: string;
  children_count: number;
}

interface MLMDistribution {
  id: string;
  project_support_payment_id: string;
  member_id: string;
  member_name: string;
  member_number: string;
  amount: number;
  distribution_pool: number;
  participants_count: number;
  distribution_date: string;
  is_company_share: boolean;
}

interface MLMStats {
  totalDistributions: number;
  totalAmountDistributed: number;
  totalReserveFund: number;
  activeMembers: number;
  companyEarnings: number;
}

export default function MLMManagement() {
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState<MLMTreeNode[]>([]);
  const [distributions, setDistributions] = useState<MLMDistribution[]>([]);
  const [stats, setStats] = useState<MLMStats>({
    totalDistributions: 0,
    totalAmountDistributed: 0,
    totalReserveFund: 0,
    activeMembers: 0,
    companyEarnings: 0,
  });

  useEffect(() => {
    fetchMLMData();
  }, []);

  const fetchMLMData = async () => {
    try {
      setLoading(true);

      // Fetch MLM tree with member details
      const { data: treeNodes, error: treeError } = await supabase
        .from("mlm_tree")
        .select(`
          *,
          profiles:member_id (
            first_name,
            last_name,
            member_number
          )
        `)
        .order("level", { ascending: true })
        .order("created_at", { ascending: true });

      if (treeError) throw treeError;

      // Count children for each node
      const treeWithCounts = treeNodes?.map((node: any) => ({
        id: node.id,
        member_id: node.member_id,
        parent_id: node.parent_id,
        level: node.level,
        position: node.position,
        member_name: `${node.profiles?.first_name || ""} ${node.profiles?.last_name || ""}`,
        member_number: node.profiles?.member_number || "",
        children_count: treeNodes.filter((n: any) => n.parent_id === node.member_id).length,
      })) || [];

      setTreeData(treeWithCounts);

      // Fetch MLM distributions with member details
      const { data: distData, error: distError } = await supabase
        .from("mlm_distributions")
        .select(`
          *,
          profiles:member_id (
            first_name,
            last_name,
            member_number
          )
        `)
        .order("distribution_date", { ascending: false });

      if (distError) throw distError;

      const formattedDist = distData?.map((dist: any) => ({
        id: dist.id,
        project_support_payment_id: dist.project_support_payment_id,
        member_id: dist.member_id,
        member_name: `${dist.profiles?.first_name || ""} ${dist.profiles?.last_name || ""}`,
        member_number: dist.profiles?.member_number || "",
        amount: dist.amount,
        distribution_pool: dist.distribution_pool,
        participants_count: dist.participants_count,
        distribution_date: dist.distribution_date,
        is_company_share: dist.is_company_share,
      })) || [];

      setDistributions(formattedDist);

      // Calculate statistics
      const totalDist = formattedDist.length;
      const totalAmount = formattedDist.reduce((sum, d) => sum + Number(d.amount), 0);
      const companyTotal = formattedDist
        .filter((d) => d.is_company_share)
        .reduce((sum, d) => sum + Number(d.amount), 0);

      // Calculate reserve fund (₦200 per approved project support payment)
      const { data: projectSupport, error: psError } = await supabase
        .from("project_support_contributions")
        .select("reserve_amount")
        .eq("payment_status", "approved")
        .eq("mlm_distributed", true);

      if (psError) throw psError;

      const totalReserve = projectSupport?.reduce(
        (sum, ps) => sum + Number(ps.reserve_amount || 200),
        0
      ) || 0;

      // Count active members in tree
      const activeMembersCount = treeWithCounts.filter(
        (node) => node.member_id !== "00000000-0000-0000-0000-000000000001"
      ).length;

      setStats({
        totalDistributions: totalDist,
        totalAmountDistributed: totalAmount,
        totalReserveFund: totalReserve,
        activeMembers: activeMembersCount,
        companyEarnings: companyTotal,
      });

      toast.success("MLM data loaded");
    } catch (error: any) {
      console.error("Error fetching MLM data:", error);
      toast.error("Failed to load MLM data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <div className="flex-1">
          <DashboardHeader />
          
          <main className="p-6 space-y-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">MLM Management</h1>
              <p className="text-muted-foreground">Manage project support fund MLM distributions and tree structure</p>
            </div>
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Distributions</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalDistributions}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Amount Distributed</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₦{stats.totalAmountDistributed.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reserve Fund</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₦{stats.totalReserveFund.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Cooperative Fund</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeMembers}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Company Earnings</CardTitle>
                  <Network className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₦{stats.companyEarnings.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="distributions" className="space-y-4">
              <TabsList>
                <TabsTrigger value="distributions">Distribution History</TabsTrigger>
                <TabsTrigger value="tree">MLM Tree</TabsTrigger>
              </TabsList>

              <TabsContent value="distributions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>MLM Distribution History</CardTitle>
                    <CardDescription>
                      All ₦30 distributions from project support fund payments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Member #</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Pool</TableHead>
                          <TableHead>Participants</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {distributions.map((dist) => (
                          <TableRow key={dist.id}>
                            <TableCell>
                              {new Date(dist.distribution_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{dist.member_name}</TableCell>
                            <TableCell>{dist.member_number}</TableCell>
                            <TableCell>₦{dist.amount.toLocaleString()}</TableCell>
                            <TableCell>₦{dist.distribution_pool.toLocaleString()}</TableCell>
                            <TableCell>{dist.participants_count}</TableCell>
                            <TableCell>
                              {dist.is_company_share ? (
                                <Badge variant="outline">Company</Badge>
                              ) : (
                                <Badge>Member</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {distributions.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                              No distributions yet
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tree" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>MLM Tree Structure</CardTitle>
                    <CardDescription>
                      Ternary tree (max 3 direct referrals per member)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Level</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Member #</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Children</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {treeData.map((node) => (
                          <TableRow key={node.id}>
                            <TableCell>{node.level}</TableCell>
                            <TableCell>{node.member_name}</TableCell>
                            <TableCell>{node.member_number}</TableCell>
                            <TableCell>{node.position}</TableCell>
                            <TableCell>{node.children_count} / 3</TableCell>
                            <TableCell>
                              {node.children_count >= 3 ? (
                                <Badge variant="destructive">Full</Badge>
                              ) : (
                                <Badge variant="default">Available</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {treeData.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              No members in tree yet
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
