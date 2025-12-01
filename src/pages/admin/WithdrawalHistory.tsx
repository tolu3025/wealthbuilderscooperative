import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, Calendar, Filter, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const WithdrawalHistory = () => {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [withdrawals, statusFilter, typeFilter, startDate, endDate, searchTerm]);

  const fetchWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          profiles!withdrawal_requests_member_id_fkey(first_name, last_name, member_number, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error: any) {
      console.error('Error fetching withdrawals:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...withdrawals];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(w => w.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(w => w.withdrawal_type === typeFilter);
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter(w => new Date(w.requested_at) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(w => new Date(w.requested_at) <= new Date(endDate));
    }

    // Search filter (member name or number)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(w => 
        w.profiles?.first_name?.toLowerCase().includes(search) ||
        w.profiles?.last_name?.toLowerCase().includes(search) ||
        w.profiles?.member_number?.toLowerCase().includes(search)
      );
    }

    setFilteredWithdrawals(filtered);
  };

  const exportToExcel = () => {
    try {
      // Prepare data for export
      const exportData = filteredWithdrawals.map(w => ({
        'Date': new Date(w.requested_at).toLocaleDateString(),
        'Member Name': `${w.profiles?.first_name || ''} ${w.profiles?.last_name || ''}`,
        'Member Number': w.profiles?.member_number || '',
        'Email': w.profiles?.email || '',
        'Phone': w.profiles?.phone || '',
        'Withdrawal Type': w.withdrawal_type || 'savings',
        'Amount': Number(w.amount),
        'Status': w.status,
        'Bank Name': w.bank_name,
        'Account Number': w.account_number,
        'Account Name': w.account_name,
        'Processed Date': w.processed_at ? new Date(w.processed_at).toLocaleDateString() : 'N/A'
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, // Date
        { wch: 20 }, // Member Name
        { wch: 15 }, // Member Number
        { wch: 25 }, // Email
        { wch: 15 }, // Phone
        { wch: 15 }, // Type
        { wch: 12 }, // Amount
        { wch: 12 }, // Status
        { wch: 20 }, // Bank Name
        { wch: 15 }, // Account Number
        { wch: 25 }, // Account Name
        { wch: 12 }  // Processed Date
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Withdrawal History');

      // Generate filename with current date
      const filename = `withdrawal-history-${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(wb, filename);
      
      toast.success(`Exported ${exportData.length} records to Excel`);
    } catch (error: any) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export data');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Withdrawal History Report', 14, 20);
      
      // Add generation date and summary
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
      doc.text(`Total Records: ${filteredWithdrawals.length}`, 14, 34);
      doc.text(`Total Amount: ₦${getTotalAmount().toLocaleString()}`, 14, 40);
      
      // Prepare table data
      const tableData = filteredWithdrawals.map(w => [
        new Date(w.requested_at).toLocaleDateString(),
        `${w.profiles?.first_name} ${w.profiles?.last_name}`,
        w.profiles?.member_number || '',
        w.withdrawal_type || 'savings',
        `₦${Number(w.amount).toLocaleString()}`,
        w.bank_name,
        w.account_number,
        w.account_name,
        w.status,
        w.processed_at ? new Date(w.processed_at).toLocaleDateString() : '-'
      ]);
      
      // Add table
      autoTable(doc, {
        head: [['Date', 'Member', 'Member #', 'Type', 'Amount', 'Bank', 'Acc #', 'Acc Name', 'Status', 'Processed']],
        body: tableData,
        startY: 46,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [0, 82, 204] }
      });
      
      // Save PDF
      doc.save(`withdrawal-history-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setStartDate("");
    setEndDate("");
    setSearchTerm("");
  };

  const getTotalAmount = () => {
    return filteredWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'approved': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
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
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader userName="Admin" />
          <main className="flex-1 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold mb-2">Withdrawal History</h1>
                <p className="text-muted-foreground">
                  Complete history of all withdrawal transactions
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportToPDF} variant="outline" className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Download PDF
                </Button>
                <Button onClick={exportToExcel} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export to Excel
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Withdrawals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{filteredWithdrawals.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₦{getTotalAmount().toLocaleString()}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {filteredWithdrawals.filter(w => w.status === 'pending').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {filteredWithdrawals.filter(w => w.status === 'completed').length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Search</label>
                    <Input
                      placeholder="Name or Member #"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Type</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="capital">Capital</SelectItem>
                        <SelectItem value="dividend">Dividend</SelectItem>
                        <SelectItem value="bonus">Bonus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Withdrawal Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Withdrawals ({filteredWithdrawals.length})</CardTitle>
                <CardDescription>
                  Complete record of withdrawal transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredWithdrawals.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No withdrawals found</p>
                ) : (
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Bank Details</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Processed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWithdrawals.map((withdrawal) => (
                          <TableRow key={withdrawal.id}>
                            <TableCell>
                              {new Date(withdrawal.requested_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {withdrawal.profiles?.first_name} {withdrawal.profiles?.last_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {withdrawal.profiles?.member_number}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {withdrawal.withdrawal_type || 'savings'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold">
                              ₦{Number(withdrawal.amount).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">{withdrawal.account_name}</div>
                                <div className="text-muted-foreground">{withdrawal.bank_name}</div>
                                <div className="font-mono text-xs">{withdrawal.account_number}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(withdrawal.status)} className="capitalize">
                                {withdrawal.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {withdrawal.processed_at 
                                ? new Date(withdrawal.processed_at).toLocaleDateString()
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default WithdrawalHistory;
