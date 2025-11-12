import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, DollarSign, TrendingUp, Network } from "lucide-react";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MLMTreeNode {
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
  member_name: string;
  member_number: string;
  amount: number;
  distribution_date: string;
  is_company_share: boolean;
  payment_id: string;
}

interface MLMStats {
  total_distributions: number;
  total_amount_distributed: number;
  total_reserve_fund: number;
  active_participants: number;
  company_earnings: number;
}

const MLMManagement = () => {
  const [loading, setLoading] = useState(true);
  const [treeNodes, setTreeNodes] = useState<MLMTreeNode[]>([]);
  const [distributions, setDistributions] = useState<MLMDistribution[]>([]);
  const [stats, setStats] = useState<MLMStats>({
    total_distributions: 0,
    total_amount_distributed: 0,
    total_reserve_fund: 0,
    active_participants: 0,
    company_earnings: 0,
  });

  useEffect(() => {
    fetchMLMData();
  }, []);

  const fetchMLMData = async () => {
    try {
      setLoading(true);

      // Fetch MLM tree
      const { data: treeData, error: treeError } = await supabase
        .from("mlm_tree")
        .select(`
          member_id,
          parent_id,
          level,
          position,
          profiles!mlm_tree_member_id_fkey (
            first_name,
            last_name,
            member_number
          )
        `)
        .order("level", { ascending: true })
        .order("created_at", { ascending: true });

      if (treeError) throw treeError;

      // Count children for each node
      const nodesWithChildren = treeData?.map((node: any) => {
        const childrenCount = treeData?.filter((n: any) => n.parent_id === node.member_id).length || 0;
        return {
          member_id: node.member_id,
          parent_id: node.parent_id,
          level: node.level,
          position: node.position,
          member_name: `${node.profiles?.first_name} ${node.profiles?.last_name}`,
          member_number: node.profiles?.member_number || "N/A",
          children_count: childrenCount,
        };
      }) || [];

      setTreeNodes(nodesWithChildren);

      // Fetch distributions
      const { data: distData, error: distError } = await supabase
        .from("mlm_distributions")
        .select(`
          id,
          amount,
          distribution_date,
          is_company_share,
          project_support_payment_id,
          profiles!mlm_distributions_member_id_fkey (
            first_name,
            last_name,
            member_number
          )
        `)
        .order("distribution_date", { ascending: false });

      if (distError) throw distError;

      const formattedDistributions = distData?.map((dist: any) => ({
        id: dist.id,
        member_name: `${dist.profiles?.first_name} ${dist.profiles?.last_name}`,
        member_number: dist.profiles?.member_number || "N/A",
        amount: dist.amount,
        distribution_date: dist.distribution_date,
        is_company_share: dist.is_company_share,
        payment_id: dist.project_support_payment_id,
      })) || [];

      setDistributions(formattedDistributions);

      // Calculate stats
      const totalDistributions = distData?.length || 0;
      const totalAmount = distData?.reduce((sum: number, d: any) => sum + Number(d.amount), 0) || 0;
      const companyEarnings = distData?.filter((d: any) => d.is_company_share).reduce((sum: number, d: any) => sum + Number(d.amount), 0) || 0;

      // Fetch reserve fund
      const { data: reserveData, error: reserveError } = await supabase
        .from("project_support_contributions")
        .select("reserve_amount")
        .eq("payment_status", "approved");

      if (reserveError) throw reserveError;

      const totalReserve = reserveData?.reduce((sum, r) => sum + Number(r.reserve_amount), 0) || 0;

      // Active participants (members with at least one distribution)
      const uniqueMembers = new Set(distData?.map((d: any) => d.member_id));
      const activeParticipants = uniqueMembers.size;

      setStats({
        total_distributions: totalDistributions,
        total_amount_distributed: totalAmount,
        total_reserve_fund: totalReserve,
        active_participants: activeParticipants,
        company_earnings: companyEarnings,
      });

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
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1">
          <DashboardHeader />
          <main className="p-6 space-y-6">
            <div>
              <h1 className="text-3xl font-bold">MLM Management</h1>
              <p className="text-muted-foreground">Manage and monitor the MLM distribution system</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Distributions</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_distributions}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Distributed</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₦{stats.total_amount_distributed.toLocaleString()}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reserve Fund</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₦{stats.total_reserve_fund.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Cooperative fund (₦200 per payment)</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Participants</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.active_participants}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Company Earnings</CardTitle>
                  <Network className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₦{stats.company_earnings.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="tree" className="w-full">
              <TabsList>
                <TabsTrigger value="tree">MLM Tree</TabsTrigger>
                <TabsTrigger value="distributions">Distribution History</TabsTrigger>
              </TabsList>

              <TabsContent value="tree" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>MLM Tree Structure</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Ternary tree structure (max 3 children per node). 4th referral automatically assigned to another member.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Member #</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Children</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {treeNodes.map((node) => (
                          <TableRow key={node.member_id}>
                            <TableCell className="font-medium">{node.member_name}</TableCell>
                            <TableCell>{node.member_number}</TableCell>
                            <TableCell>
                              <Badge variant="outline">Level {node.level}</Badge>
                            </TableCell>
                            <TableCell>Pos {node.position}</TableCell>
                            <TableCell>{node.children_count}/3</TableCell>
                            <TableCell>
                              {node.children_count >= 3 ? (
                                <Badge variant="secondary">Full</Badge>
                              ) : (
                                <Badge variant="default">Available</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="distributions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribution History</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      All MLM distributions (₦30 per member per distribution event)
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Member #</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {distributions.map((dist) => (
                          <TableRow key={dist.id}>
                            <TableCell>
                              {new Date(dist.distribution_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">{dist.member_name}</TableCell>
                            <TableCell>{dist.member_number}</TableCell>
                            <TableCell>₦{dist.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              {dist.is_company_share ? (
                                <Badge variant="secondary">Company</Badge>
                              ) : (
                                <Badge variant="default">Member</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
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
};

export default MLMManagement;
