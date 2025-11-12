import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Loader2, Users, Network, DollarSign, TrendingUp } from "lucide-react";
import { toast } from "sonner";

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
  member_id: string;
  member_name: string;
  member_number: string;
  amount: number;
  distribution_date: string;
  is_company_share: boolean;
}

interface MLMStats {
  total_members: number;
  total_distributed: number;
  total_reserve: number;
  total_distributions: number;
}

export default function MLMManagement() {
  const [loading, setLoading] = useState(true);
  const [treeNodes, setTreeNodes] = useState<MLMTreeNode[]>([]);
  const [distributions, setDistributions] = useState<MLMDistribution[]>([]);
  const [stats, setStats] = useState<MLMStats>({
    total_members: 0,
    total_distributed: 0,
    total_reserve: 0,
    total_distributions: 0,
  });

  useEffect(() => {
    fetchMLMData();
  }, []);

  const fetchMLMData = async () => {
    try {
      setLoading(true);

      // Fetch MLM tree with member details
      const { data: treeData, error: treeError } = await supabase
        .from("mlm_tree")
        .select(`
          id,
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

      // Calculate children count for each node
      const nodesWithChildren = treeData?.map((node: any) => {
        const childrenCount = treeData.filter((n: any) => n.parent_id === node.member_id).length;
        return {
          id: node.id,
          member_id: node.member_id,
          parent_id: node.parent_id,
          level: node.level,
          position: node.position,
          member_name: `${node.profiles?.first_name || ""} ${node.profiles?.last_name || ""}`.trim(),
          member_number: node.profiles?.member_number || "N/A",
          children_count: childrenCount,
        };
      }) || [];

      setTreeNodes(nodesWithChildren);

      // Fetch distributions with member details
      const { data: distData, error: distError } = await supabase
        .from("mlm_distributions")
        .select(`
          id,
          member_id,
          amount,
          distribution_date,
          is_company_share,
          profiles!mlm_distributions_member_id_fkey (
            first_name,
            last_name,
            member_number
          )
        `)
        .order("distribution_date", { ascending: false });

      if (distError) throw distError;

      const formattedDist = distData?.map((dist: any) => ({
        id: dist.id,
        member_id: dist.member_id,
        member_name: `${dist.profiles?.first_name || ""} ${dist.profiles?.last_name || ""}`.trim(),
        member_number: dist.profiles?.member_number || "N/A",
        amount: dist.amount,
        distribution_date: dist.distribution_date,
        is_company_share: dist.is_company_share,
      })) || [];

      setDistributions(formattedDist);

      // Calculate stats
      const totalDistributed = formattedDist.reduce((sum, d) => sum + Number(d.amount), 0);
      
      const { data: reserveData } = await supabase
        .from("project_support_contributions")
        .select("reserve_amount")
        .eq("payment_status", "approved");

      const totalReserve = reserveData?.reduce((sum, r) => sum + Number(r.reserve_amount || 0), 0) || 0;

      setStats({
        total_members: nodesWithChildren.length,
        total_distributed: totalDistributed,
        total_reserve: totalReserve,
        total_distributions: formattedDist.length,
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
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1">
          <DashboardHeader />
          <main className="container mx-auto p-6 space-y-6">
            <div>
              <h1 className="text-3xl font-bold">MLM Management</h1>
              <p className="text-muted-foreground">Manage and monitor the MLM distribution system</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_members}</div>
                  <p className="text-xs text-muted-foreground">In MLM tree</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Distributed</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₦{stats.total_distributed.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">All-time MLM earnings</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reserve Fund</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₦{stats.total_reserve.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Cooperative fund (₦200/payment)</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Distributions</CardTitle>
                  <Network className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_distributions}</div>
                  <p className="text-xs text-muted-foreground">Total distribution events</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="tree" className="w-full">
              <TabsList>
                <TabsTrigger value="tree">MLM Tree</TabsTrigger>
                <TabsTrigger value="distributions">Distribution History</TabsTrigger>
              </TabsList>

              <TabsContent value="tree" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>MLM Tree Structure</CardTitle>
                    <CardDescription>
                      Ternary tree showing member hierarchy (max 3 direct referrals per member)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Member Number</TableHead>
                          <TableHead>Level</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Children</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {treeNodes.map((node) => (
                          <TableRow key={node.id}>
                            <TableCell className="font-medium">{node.member_name}</TableCell>
                            <TableCell>{node.member_number}</TableCell>
                            <TableCell>
                              <Badge variant="outline">Level {node.level}</Badge>
                            </TableCell>
                            <TableCell>{node.position}</TableCell>
                            <TableCell>{node.children_count}/3</TableCell>
                            <TableCell>
                              <Badge variant={node.children_count >= 3 ? "destructive" : "default"}>
                                {node.children_count >= 3 ? "Full" : "Available"}
                              </Badge>
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
                    <CardDescription>
                      All MLM earnings distributed to members (₦30 per distribution event)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Member Number</TableHead>
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
                              <Badge variant={dist.is_company_share ? "secondary" : "default"}>
                                {dist.is_company_share ? "Company Share" : "Member Share"}
                              </Badge>
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
}
