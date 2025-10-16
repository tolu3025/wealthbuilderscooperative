import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import * as XLSX from 'xlsx';

const Reports = () => {
  const [loading, setLoading] = useState(false);

  const exportToExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportMembersList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('member_number, first_name, last_name, email, phone, state, registration_status, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        exportToExcel(data, 'members_list');
        toast.success("Members list exported successfully");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contributions')
        .select(`
          id,
          amount,
          capital_amount,
          savings_amount,
          payment_status,
          payment_date,
          contribution_month,
          created_at,
          profiles!contributions_member_id_fkey(member_number, first_name, last_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        const formatted = data.map(item => ({
          id: item.id,
          member_number: item.profiles?.member_number,
          member_name: `${item.profiles?.first_name} ${item.profiles?.last_name}`,
          amount: item.amount,
          capital_amount: item.capital_amount,
          savings_amount: item.savings_amount,
          payment_status: item.payment_status,
          payment_date: item.payment_date,
          contribution_month: item.contribution_month,
          created_at: item.created_at
        }));
        exportToExcel(formatted, 'transactions');
        toast.success("Transactions exported successfully");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportBalances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('member_balances')
        .select(`
          *,
          profiles!member_balances_member_id_fkey(member_number, first_name, last_name, email)
        `)
        .order('total_capital', { ascending: false });
      
      if (error) throw error;
      if (data) {
        const formatted = data.map(item => ({
          member_number: item.profiles?.member_number,
          member_name: `${item.profiles?.first_name} ${item.profiles?.last_name}`,
          email: item.profiles?.email,
          total_capital: item.total_capital,
          total_savings: item.total_savings,
          total_project_support: item.total_project_support,
          months_contributed: item.months_contributed,
          eligible_for_dividend: item.eligible_for_dividend,
          eligible_for_withdrawal: item.eligible_for_withdrawal,
          last_contribution_date: item.last_contribution_date
        }));
        exportToExcel(formatted, 'member_balances');
        toast.success("Balances exported successfully");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportCommissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          *,
          profiles!commissions_member_id_fkey(member_number, first_name, last_name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        const formatted = data.map(item => ({
          member_number: item.profiles?.member_number,
          member_name: `${item.profiles?.first_name} ${item.profiles?.last_name}`,
          amount: item.amount,
          commission_type: item.commission_type,
          status: item.status,
          created_at: item.created_at
        }));
        exportToExcel(formatted, 'commissions');
        toast.success("Commissions exported successfully");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const reports = [
    {
      title: "Members List",
      description: "Export all member details including contact and registration info",
      action: exportMembersList,
      icon: FileText
    },
    {
      title: "Transactions Report",
      description: "Export all contribution transactions with member details",
      action: exportTransactions,
      icon: FileText
    },
    {
      title: "Member Balances",
      description: "Export current balances, capital, and savings for all members",
      action: exportBalances,
      icon: FileText
    },
    {
      title: "Commissions Report",
      description: "Export all commission earnings by type and status",
      action: exportCommissions,
      icon: FileText
    }
  ];

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader userName="Admin" />
          <main className="flex-1 p-6 overflow-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Reports & Export</h1>
              <p className="text-muted-foreground">
                Generate and download various reports in Excel format
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reports.map((report, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <report.icon className="h-5 w-5 text-primary" />
                        <CardTitle>{report.title}</CardTitle>
                      </div>
                    </div>
                    <CardDescription>{report.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={report.action} 
                      disabled={loading}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export to Excel
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Reports;
