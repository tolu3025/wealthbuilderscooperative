import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  CheckCircle, 
  XCircle,
  FileText,
  Download,
  Eye,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

interface DashboardStats {
  totalMembers: number;
  totalCapital: number;
  pendingRegistrations: number;
  pendingContributions: number;
  pendingWithdrawals: number;
  monthlyContributions: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    totalCapital: 0,
    pendingRegistrations: 0,
    pendingContributions: 0,
    pendingWithdrawals: 0,
    monthlyContributions: 0
  });
  const [loading, setLoading] = useState(true);
  const [pendingRegs, setPendingRegs] = useState<any[]>([]);
  const [pendingContribs, setPendingContribs] = useState<any[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [dividendProfit, setDividendProfit] = useState("");
  const [selectedProperty, setSelectedProperty] = useState("");
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch total members
      const { count: membersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total capital
      const { data: contributions } = await supabase
        .from('contributions')
        .select('capital_amount');
      const totalCapital = contributions?.reduce((sum, c) => sum + Number(c.capital_amount), 0) || 0;

      // Fetch pending registrations
      const { data: pendingRegData, count: pendingRegsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('registration_status', 'pending_approval');
      setPendingRegs(pendingRegData || []);

      // Fetch pending contributions
      const { data: pendingContribData, count: pendingContribsCount } = await supabase
        .from('contributions')
        .select(`
          *,
          profiles!contributions_member_id_fkey(first_name, last_name, member_number)
        `)
        .eq('payment_status', 'pending');
      setPendingContribs(pendingContribData || []);

      // Fetch pending withdrawals
      const { data: withdrawalData, count: withdrawalsCount } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          profiles!withdrawal_requests_member_id_fkey(first_name, last_name, member_number)
        `)
        .eq('status', 'pending');
      setPendingWithdrawals(withdrawalData || []);

      // Fetch monthly contributions (current month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { data: monthlyContribs } = await supabase
        .from('contributions')
        .select('amount')
        .gte('created_at', startOfMonth.toISOString());
      const monthlyTotal = monthlyContribs?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

      // Fetch properties
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      setProperties(propertiesData || []);

      setStats({
        totalMembers: membersCount || 0,
        totalCapital,
        pendingRegistrations: pendingRegsCount || 0,
        pendingContributions: pendingContribsCount || 0,
        pendingWithdrawals: withdrawalsCount || 0,
        monthlyContributions: monthlyTotal
      });
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePIN = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const approveRegistration = async (profileId: string) => {
    try {
      const pin = generatePIN();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          registration_status: 'pending_activation',
          registration_pin: pin
        })
        .eq('id', profileId);

      if (error) throw error;
      
      toast.success(`Registration approved! PIN: ${pin}`, {
        description: `Send this PIN to the member via WhatsApp: +234 803 374 0309`,
        duration: 10000
      });
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const approveContribution = async (contributionId: string, memberIs: string) => {
    try {
      const { error } = await supabase
        .from('contributions')
        .update({
          payment_status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', contributionId);

      if (error) throw error;
      
      toast.success("Contribution approved successfully");
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const approveWithdrawal = async (withdrawalId: string) => {
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawalId);

      if (error) throw error;
      
      toast.success("Withdrawal approved successfully");
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDividendDistribution = async () => {
    if (!dividendProfit || !selectedProperty) {
      toast.error("Please enter profit amount and select property");
      return;
    }

    try {
      // Fetch eligible members
      const { data: members } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          member_number
        `);

      if (!members) return;

      // Calculate each member's capital
      const memberCapitals = await Promise.all(
        members.map(async (member) => {
          const { data: contribs } = await supabase
            .from('contributions')
            .select('capital_amount')
            .eq('member_id', member.id)
            .eq('payment_status', 'approved');

          const totalCapital = contribs?.reduce((sum, c) => sum + Number(c.capital_amount), 0) || 0;
          
          // Check if eligible (₦50,000+ capital)
          return totalCapital >= 50000 ? { ...member, totalCapital } : null;
        })
      );

      const eligibleMembers = memberCapitals.filter(Boolean);
      const totalEligibleCapital = eligibleMembers.reduce((sum, m) => sum + (m?.totalCapital || 0), 0);

      // Create distribution record
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

      // Calculate and insert individual dividends
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
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const exportToExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportMembersList = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('member_number, first_name, last_name, email, state, created_at');
    if (data) exportToExcel(data, 'members_list');
  };

  const exportTransactions = async () => {
    const { data } = await supabase
      .from('contributions')
      .select(`
        *,
        profiles!contributions_member_id_fkey(member_number, first_name, last_name)
      `);
    if (data) exportToExcel(data, 'transactions');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage cooperative operations and finances</p>
          </div>
          <Button onClick={() => navigate('/admin/blog')}>
            <FileText className="mr-2 h-4 w-4" />
            Manage Blog
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-8">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMembers}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-secondary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Capital</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">₦{(stats.totalCapital / 1000000).toFixed(1)}M</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Regs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.pendingRegistrations}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Contribs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.pendingContributions}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Withdrawals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.pendingWithdrawals}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-green-600">
                ₦{(stats.monthlyContributions / 1000).toFixed(0)}K
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="registrations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            <TabsTrigger value="registrations">Registrations</TabsTrigger>
            <TabsTrigger value="contributions">Contributions</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="dividends">Dividends</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Pending Registrations Tab */}
          <TabsContent value="registrations">
            <Card>
              <CardHeader>
                <CardTitle>Pending Registration Approvals</CardTitle>
                <CardDescription>
                  Review payment proofs and approve new members. Send generated PINs via WhatsApp: +234 803 374 0309
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRegs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending registrations</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRegs.map((reg) => (
                        <TableRow key={reg.id}>
                          <TableCell className="font-medium">
                            {reg.first_name} {reg.last_name}
                          </TableCell>
                          <TableCell>{reg.email}</TableCell>
                          <TableCell>{reg.state}</TableCell>
                          <TableCell>{new Date(reg.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              onClick={() => approveRegistration(reg.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Generate PIN
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Contributions Tab */}
          <TabsContent value="contributions">
            <Card>
              <CardHeader>
                <CardTitle>Pending Contribution Approvals</CardTitle>
                <CardDescription>Review and approve member contributions</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingContribs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending contributions</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingContribs.map((contrib: any) => (
                        <TableRow key={contrib.id}>
                          <TableCell className="font-medium">
                            {contrib.profiles?.first_name} {contrib.profiles?.last_name}
                            <br />
                            <span className="text-xs text-muted-foreground">
                              {contrib.profiles?.member_number}
                            </span>
                          </TableCell>
                          <TableCell>₦{Number(contrib.amount).toLocaleString()}</TableCell>
                          <TableCell>
                            {contrib.receipt_url && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader>
                                    <DialogTitle>Payment Receipt</DialogTitle>
                                  </DialogHeader>
                                  <img 
                                    src={contrib.receipt_url} 
                                    alt="Receipt" 
                                    className="w-full rounded-lg"
                                  />
                                </DialogContent>
                              </Dialog>
                            )}
                          </TableCell>
                          <TableCell>{new Date(contrib.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              onClick={() => approveContribution(contrib.id, contrib.member_id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals">
            <Card>
              <CardHeader>
                <CardTitle>Pending Withdrawal Requests</CardTitle>
                <CardDescription>Review and approve withdrawal requests</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingWithdrawals.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending withdrawals</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Bank Details</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingWithdrawals.map((withdrawal: any) => (
                        <TableRow key={withdrawal.id}>
                          <TableCell className="font-medium">
                            {withdrawal.profiles?.first_name} {withdrawal.profiles?.last_name}
                          </TableCell>
                          <TableCell>₦{Number(withdrawal.amount).toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{withdrawal.account_name}</div>
                              <div className="text-muted-foreground">{withdrawal.account_number}</div>
                              <div className="text-muted-foreground">{withdrawal.bank_name}</div>
                            </div>
                          </TableCell>
                          <TableCell>{new Date(withdrawal.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => approveWithdrawal(withdrawal.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dividends Tab */}
          <TabsContent value="dividends">
            <Card>
              <CardHeader>
                <CardTitle>Dividend Distribution</CardTitle>
                <CardDescription>
                  Enter property sale profit to automatically distribute dividends to eligible members
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="property">Select Property</Label>
                    <select
                      id="property"
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      value={selectedProperty}
                      onChange={(e) => setSelectedProperty(e.target.value)}
                    >
                      <option value="">-- Select Property --</option>
                      {properties.map(prop => (
                        <option key={prop.id} value={prop.id}>{prop.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profit">Property Sale Profit (₦)</Label>
                    <Input
                      id="profit"
                      type="number"
                      placeholder="Enter profit amount"
                      value={dividendProfit}
                      onChange={(e) => setDividendProfit(e.target.value)}
                    />
                  </div>
                </div>
                <div className="bg-primary/5 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Dividends will be distributed based on each member's total capital contribution
                  </p>
                  <p className="text-sm font-semibold">
                    Only members with ₦50,000+ capital and 6+ months are eligible
                  </p>
                </div>
                <Button onClick={handleDividendDistribution} className="w-full" size="lg">
                  Calculate & Distribute Dividends
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Financial Reports & Exports</CardTitle>
                <CardDescription>Download reports in Excel format</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start" onClick={exportMembersList}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Member List (Excel)
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={exportTransactions}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Transaction History (Excel)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="mr-2 h-4 w-4" />
                  Export Commission Schedule (Excel)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="mr-2 h-4 w-4" />
                  Export Dividend Distribution Report (Excel)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
