import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Users, TrendingUp, DollarSign, Network, Info, ChevronRight, Gift, Coins, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface BonusTreeNode {
  id: string;
  member_id: string;
  parent_id: string | null;
  level: number;
  position: number;
  member_name: string;
  member_number: string;
  children_count: number;
}

interface BonusDistribution {
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

interface MemberSummary {
  id: string;
  member_id: string;
  member_name: string;
  member_number: string;
  referral_count: number;
  referral_earnings: number;
  mlm_earnings: number;
  total_bonus: number;
  withdrawn: number;
  available_balance: number;
}

interface MemberBonusDetail {
  referralCommissions: Array<{
    id: string;
    amount: number;
    invited_member_name: string;
    created_at: string;
    status: string;
  }>;
  mlmDistributions: Array<{
    id: string;
    amount: number;
    distribution_date: string;
    payment_month: string;
  }>;
  withdrawals: Array<{
    id: string;
    amount: number;
    requested_at: string;
    status: string;
  }>;
  summary: {
    totalReferrals: number;
    totalReferralEarnings: number;
    totalMLMEarnings: number;
    totalWithdrawn: number;
    availableBalance: number;
  };
}

interface BonusStats {
  totalDistributions: number;
  totalAmountDistributed: number;
  totalReserveFund: number;
  activeMembers: number;
  companyEarnings: number;
}

export default function BonusDistribution() {
  const [loading, setLoading] = useState(true);
  const [treeData, setTreeData] = useState<BonusTreeNode[]>([]);
  const [distributions, setDistributions] = useState<BonusDistribution[]>([]);
  const [memberSummaries, setMemberSummaries] = useState<MemberSummary[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberSummary | null>(null);
  const [memberDetail, setMemberDetail] = useState<MemberBonusDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stats, setStats] = useState<BonusStats>({
    totalDistributions: 0,
    totalAmountDistributed: 0,
    totalReserveFund: 0,
    activeMembers: 0,
    companyEarnings: 0,
  });

  useEffect(() => {
    fetchBonusData();
  }, []);

  const fetchBonusData = async () => {
    try {
      setLoading(true);

      // Fetch bonus tree with member details
      const { data: treeNodes, error: treeError } = await supabase
        .from("mlm_tree")
        .select(`
          *,
          profiles:member_id (
            first_name,
            last_name,
            member_number,
            registration_status
          )
        `)
        .order("level", { ascending: true })
        .order("created_at", { ascending: true });

      if (treeError) throw treeError;

      // Filter only active members for display
      const activeTreeNodes = treeNodes?.filter((node: any) => 
        node.member_id === '00000000-0000-0000-0000-000000000001' || 
        node.profiles?.registration_status === 'active'
      ) || [];

      // Count children for each node
      const treeWithCounts = activeTreeNodes.map((node: any) => ({
        id: node.id,
        member_id: node.member_id,
        parent_id: node.parent_id,
        level: node.level,
        position: node.position,
        member_name: `${node.profiles?.first_name || ""} ${node.profiles?.last_name || ""}`,
        member_number: node.profiles?.member_number || "",
        children_count: activeTreeNodes.filter((n: any) => n.parent_id === node.member_id).length,
      }));

      setTreeData(treeWithCounts);

      // Fetch bonus distributions with member details
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

      // Fetch member summaries with bonus breakdown
      await fetchMemberSummaries();

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

      toast.success("Bonus data loaded");
    } catch (error: any) {
      console.error("Error fetching bonus data:", error);
      toast.error("Failed to load bonus data");
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberSummaries = async () => {
    try {
      // Get all active members with their bonus data
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, member_number")
        .eq("registration_status", "active")
        .neq("id", "00000000-0000-0000-0000-000000000001");

      if (profilesError) throw profilesError;

      // Get commissions, MLM distributions, and withdrawals for each member
      const summaries: MemberSummary[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Referral commissions
          const { data: commissions } = await supabase
            .from("commissions")
            .select("amount")
            .eq("member_id", profile.id)
            .eq("commission_type", "referral")
            .eq("status", "approved");

          const referralCount = commissions?.length || 0;
          const referralEarnings = commissions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

          // MLM distributions
          const { data: mlmDist } = await supabase
            .from("mlm_distributions")
            .select("amount")
            .eq("member_id", profile.id)
            .eq("is_company_share", false);

          const mlmEarnings = mlmDist?.reduce((sum, d) => sum + Number(d.amount), 0) || 0;

          // Bonus withdrawals
          const { data: withdrawals } = await supabase
            .from("withdrawal_requests")
            .select("amount")
            .eq("member_id", profile.id)
            .eq("withdrawal_type", "bonus")
            .eq("status", "approved");

          const withdrawn = withdrawals?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

          const totalBonus = referralEarnings + mlmEarnings;
          const availableBalance = totalBonus - withdrawn;

          return {
            id: profile.id,
            member_id: profile.id,
            member_name: `${profile.first_name} ${profile.last_name}`,
            member_number: profile.member_number || "",
            referral_count: referralCount,
            referral_earnings: referralEarnings,
            mlm_earnings: mlmEarnings,
            total_bonus: totalBonus,
            withdrawn,
            available_balance: availableBalance,
          };
        })
      );

      // Sort by total bonus descending
      summaries.sort((a, b) => b.total_bonus - a.total_bonus);
      setMemberSummaries(summaries);
    } catch (error) {
      console.error("Error fetching member summaries:", error);
    }
  };

  const fetchMemberDetail = async (member: MemberSummary) => {
    try {
      setDetailLoading(true);
      setSelectedMember(member);
      setDialogOpen(true);

      // Fetch referral commissions with invited member details
      const { data: commissions } = await supabase
        .from("commissions")
        .select(`
          id,
          amount,
          created_at,
          status,
          invited_member:invited_member_id (
            first_name,
            last_name
          )
        `)
        .eq("member_id", member.member_id)
        .eq("commission_type", "referral")
        .order("created_at", { ascending: false });

      // Fetch MLM distributions with payment details
      const { data: mlmDist } = await supabase
        .from("mlm_distributions")
        .select(`
          id,
          amount,
          distribution_date,
          project_support_contributions:project_support_payment_id (
            contribution_month
          )
        `)
        .eq("member_id", member.member_id)
        .eq("is_company_share", false)
        .order("distribution_date", { ascending: false });

      // Fetch bonus withdrawals
      const { data: withdrawals } = await supabase
        .from("withdrawal_requests")
        .select("id, amount, requested_at, status")
        .eq("member_id", member.member_id)
        .eq("withdrawal_type", "bonus")
        .order("requested_at", { ascending: false });

      const referralCommissions = (commissions || []).map((c: any) => ({
        id: c.id,
        amount: c.amount,
        invited_member_name: c.invited_member 
          ? `${c.invited_member.first_name} ${c.invited_member.last_name}`
          : "Unknown",
        created_at: c.created_at,
        status: c.status,
      }));

      const mlmDistributions = (mlmDist || []).map((d: any) => ({
        id: d.id,
        amount: d.amount,
        distribution_date: d.distribution_date,
        payment_month: d.project_support_contributions?.contribution_month 
          ? new Date(d.project_support_contributions.contribution_month).toLocaleDateString("en-US", { month: "short", year: "numeric" })
          : "N/A",
      }));

      const withdrawalList = (withdrawals || []).map((w: any) => ({
        id: w.id,
        amount: w.amount,
        requested_at: w.requested_at,
        status: w.status,
      }));

      const totalReferralEarnings = referralCommissions
        .filter(c => c.status === "approved")
        .reduce((sum, c) => sum + Number(c.amount), 0);
      
      const totalMLMEarnings = mlmDistributions.reduce((sum, d) => sum + Number(d.amount), 0);
      
      const totalWithdrawn = withdrawalList
        .filter(w => w.status === "approved")
        .reduce((sum, w) => sum + Number(w.amount), 0);

      setMemberDetail({
        referralCommissions,
        mlmDistributions,
        withdrawals: withdrawalList,
        summary: {
          totalReferrals: referralCommissions.length,
          totalReferralEarnings,
          totalMLMEarnings,
          totalWithdrawn,
          availableBalance: totalReferralEarnings + totalMLMEarnings - totalWithdrawn,
        },
      });
    } catch (error) {
      console.error("Error fetching member detail:", error);
      toast.error("Failed to load member details");
    } finally {
      setDetailLoading(false);
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
              <h1 className="text-3xl font-bold">Bonus Distribution Management</h1>
              <p className="text-muted-foreground">Manage project support fund bonus distributions and invite structure</p>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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

            <Tabs defaultValue="members" className="space-y-4">
              <TabsList>
                <TabsTrigger value="members">Member Summary</TabsTrigger>
                <TabsTrigger value="distributions">Distribution History</TabsTrigger>
                <TabsTrigger value="tree">Invite Tree</TabsTrigger>
              </TabsList>

              <TabsContent value="members" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Member Bonus Summary</CardTitle>
                    <CardDescription>
                      Click on a member to see detailed breakdown of their bonus earnings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap">Member</TableHead>
                              <TableHead className="whitespace-nowrap">Member #</TableHead>
                              <TableHead className="whitespace-nowrap text-right">Referrals</TableHead>
                              <TableHead className="whitespace-nowrap text-right">Referral Earnings</TableHead>
                              <TableHead className="whitespace-nowrap text-right">MLM Earnings</TableHead>
                              <TableHead className="whitespace-nowrap text-right">Total Bonus</TableHead>
                              <TableHead className="whitespace-nowrap text-right">Withdrawn</TableHead>
                              <TableHead className="whitespace-nowrap text-right">Balance</TableHead>
                              <TableHead className="whitespace-nowrap">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {memberSummaries.map((member) => (
                              <TableRow 
                                key={member.id} 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => fetchMemberDetail(member)}
                              >
                                <TableCell className="font-medium">{member.member_name}</TableCell>
                                <TableCell>{member.member_number}</TableCell>
                                <TableCell className="text-right">{member.referral_count}</TableCell>
                                <TableCell className="text-right">₦{member.referral_earnings.toLocaleString()}</TableCell>
                                <TableCell className="text-right">₦{member.mlm_earnings.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-medium">₦{member.total_bonus.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-muted-foreground">₦{member.withdrawn.toLocaleString()}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant={member.available_balance > 0 ? "default" : "secondary"}>
                                    ₦{member.available_balance.toLocaleString()}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm">
                                    <Info className="h-4 w-4 mr-1" />
                                    Details
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                            {memberSummaries.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center text-muted-foreground">
                                  No members with bonus data
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="distributions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Bonus Distribution History</CardTitle>
                    <CardDescription>
                      All ₦30 distributions from project support fund payments (spillover goes to company)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap">Date</TableHead>
                              <TableHead className="whitespace-nowrap">Member</TableHead>
                              <TableHead className="whitespace-nowrap">Member #</TableHead>
                              <TableHead className="whitespace-nowrap">Amount</TableHead>
                              <TableHead className="whitespace-nowrap">Pool</TableHead>
                              <TableHead className="whitespace-nowrap">Participants</TableHead>
                              <TableHead className="whitespace-nowrap">Type</TableHead>
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tree" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Invite Tree Structure</CardTitle>
                    <CardDescription>
                      Ternary tree (max 3 direct invites per member)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap">Level</TableHead>
                              <TableHead className="whitespace-nowrap">Member</TableHead>
                              <TableHead className="whitespace-nowrap">Member #</TableHead>
                              <TableHead className="whitespace-nowrap">Position</TableHead>
                              <TableHead className="whitespace-nowrap">Children</TableHead>
                              <TableHead className="whitespace-nowrap">Status</TableHead>
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>

      {/* Member Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bonus Breakdown: {selectedMember?.member_name}
            </DialogTitle>
            <DialogDescription>
              Member #{selectedMember?.member_number} - Complete bonus earnings breakdown
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : memberDetail ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Gift className="h-4 w-4" />
                      Referral Bonus
                    </div>
                    <div className="text-xl font-bold text-primary">
                      ₦{memberDetail.summary.totalReferralEarnings.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {memberDetail.summary.totalReferrals} invites × ₦1,000
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-secondary/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Coins className="h-4 w-4" />
                      MLM Bonus
                    </div>
                    <div className="text-xl font-bold">
                      ₦{memberDetail.summary.totalMLMEarnings.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {memberDetail.mlmDistributions.length} pools × ₦30
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-destructive/10">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Wallet className="h-4 w-4" />
                      Withdrawn
                    </div>
                    <div className="text-xl font-bold text-destructive">
                      ₦{memberDetail.summary.totalWithdrawn.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {memberDetail.withdrawals.filter(w => w.status === 'approved').length} withdrawals
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-accent/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <DollarSign className="h-4 w-4" />
                      Available
                    </div>
                    <div className="text-xl font-bold text-accent-foreground">
                      ₦{memberDetail.summary.availableBalance.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Current balance
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Calculation Formula */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">How This Balance Was Calculated</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Referral Bonus ({memberDetail.summary.totalReferrals} × ₦1,000)</span>
                      <span className="text-primary">+ ₦{memberDetail.summary.totalReferralEarnings.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>MLM Bonus ({memberDetail.mlmDistributions.length} × ₦30)</span>
                      <span className="text-primary">+ ₦{memberDetail.summary.totalMLMEarnings.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Withdrawals</span>
                      <span className="text-destructive">- ₦{memberDetail.summary.totalWithdrawn.toLocaleString()}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold">
                      <span>Available Balance</span>
                      <span>= ₦{memberDetail.summary.availableBalance.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Referral Details */}
              {memberDetail.referralCommissions.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      Referral Commissions Detail
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invited Member</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memberDetail.referralCommissions.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{c.invited_member_name}</TableCell>
                            <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>₦{c.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={c.status === 'approved' ? 'default' : 'secondary'}>
                                {c.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* MLM Details */}
              {memberDetail.mlmDistributions.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Coins className="h-4 w-4" />
                      MLM Distribution Detail
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment Month</TableHead>
                          <TableHead>Distribution Date</TableHead>
                          <TableHead>Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memberDetail.mlmDistributions.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell>{d.payment_month}</TableCell>
                            <TableCell>{new Date(d.distribution_date).toLocaleDateString()}</TableCell>
                            <TableCell>₦{d.amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Withdrawal Details */}
              {memberDetail.withdrawals.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Withdrawal History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memberDetail.withdrawals.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell>{new Date(w.requested_at).toLocaleDateString()}</TableCell>
                            <TableCell>₦{w.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={w.status === 'approved' ? 'default' : w.status === 'pending' ? 'secondary' : 'destructive'}>
                                {w.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
