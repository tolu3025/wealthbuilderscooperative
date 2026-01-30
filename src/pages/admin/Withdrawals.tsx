import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2, AlertCircle, FileDown, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

const Withdrawals = () => {
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingWithdrawals();
  }, []);

  const fetchPendingWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          profiles!withdrawal_requests_member_id_fkey(first_name, last_name, member_number, id)
        `)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch balances for each member including pending withdrawals
      const withdrawalsWithBalances = await Promise.all(
        (data || []).map(async (withdrawal: any) => {
          const memberId = withdrawal.profiles?.id;
          
          // Fetch member balance
          const { data: balance } = await supabase
            .from('member_balances')
            .select('total_savings, total_capital, total_commissions, total_dividends')
            .eq('member_id', memberId)
            .single();

          // Fetch ALL pending/approved withdrawals for this member to calculate true available balance
          const { data: allMemberWithdrawals } = await supabase
            .from('withdrawal_requests')
            .select('amount, withdrawal_type')
            .eq('member_id', memberId)
            .in('status', ['pending', 'approved']);

          // Calculate pending amounts per withdrawal type
          const pendingSavings = allMemberWithdrawals
            ?.filter(w => w.withdrawal_type === 'savings')
            .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
          
          const pendingCapital = allMemberWithdrawals
            ?.filter(w => w.withdrawal_type === 'capital')
            .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
          
          const pendingDividends = allMemberWithdrawals
            ?.filter(w => w.withdrawal_type === 'dividend')
            .reduce((sum, w) => sum + Number(w.amount), 0) || 0;
          
          const pendingBonuses = allMemberWithdrawals
            ?.filter(w => w.withdrawal_type === 'bonus')
            .reduce((sum, w) => sum + Number(w.amount), 0) || 0;

          // Calculate TRUE available balances (raw balance minus pending/approved withdrawals)
          return {
            ...withdrawal,
            balances: {
              savings: Math.max(0, (balance?.total_savings || 0) - pendingSavings),
              capital: Math.max(0, (balance?.total_capital || 0) - pendingCapital),
              dividend: Math.max(0, (balance?.total_dividends || 0) - pendingDividends),
              bonus: Math.max(0, (balance?.total_commissions || 0) - pendingBonuses)
            }
          };
        })
      );

      setPendingWithdrawals(withdrawalsWithBalances);
    } catch (error: any) {
      console.error('Error fetching withdrawals:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const approveWithdrawal = async (withdrawalId: string, memberId: string, amount: number, withdrawalType: string = 'savings') => {
    try {
      // Get member profile and balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', memberId)
        .single();

      if (!profile) throw new Error('Member not found');

      const { data: balance } = await supabase
        .from('member_balances')
        .select('total_savings, total_capital, total_commissions, total_dividends, months_contributed')
        .eq('member_id', memberId)
        .single();

      if (!balance) throw new Error('Member balance not found');

      const bonusBalance = balance.total_commissions || 0;
      const dividendBalance = balance.total_dividends || 0;

      // Validate based on withdrawal type
      if (withdrawalType === 'savings') {
        if (amount > balance.total_savings) {
          throw new Error('Insufficient savings balance');
        }
      } else if (withdrawalType === 'capital') {
        if (amount > balance.total_capital) {
          throw new Error('Insufficient capital balance');
        }
        // Check minimum capital requirement for capital withdrawals only
        if (balance.total_capital - amount < 50000) {
          throw new Error('Cannot approve: Withdrawal would drop capital below ₦50,000 minimum');
        }
      } else if (withdrawalType === 'dividend') {
        if (amount > dividendBalance) {
          throw new Error('Insufficient dividend balance');
        }
      } else if (withdrawalType === 'bonus') {
        if (amount > bonusBalance) {
          throw new Error('Insufficient bonus balance');
        }
      }

      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawalId);

      if (updateError) throw updateError;

      // Add to monthly settlements
      const settlementMonth = new Date().toISOString().slice(0, 7) + '-01';
      const { data: existingSettlement } = await supabase
        .from('monthly_settlements')
        .select('id, total_withdrawals')
        .eq('settlement_month', settlementMonth)
        .single();

      if (existingSettlement) {
        await supabase
          .from('monthly_settlements')
          .update({
            total_withdrawals: (existingSettlement.total_withdrawals || 0) + amount
          })
          .eq('id', existingSettlement.id);
      } else {
        await supabase
          .from('monthly_settlements')
          .insert({
            settlement_month: settlementMonth,
            total_withdrawals: amount,
            status: 'pending'
          });
      }

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: profile.user_id,
          title: 'Withdrawal Approved',
          message: `Your ${withdrawalType} withdrawal of ₦${amount.toLocaleString()} has been approved and will be processed shortly.`,
          type: 'withdrawal_status',
          related_id: withdrawalId
        });

      if (notifError) console.error('Failed to send notification:', notifError);
      
      toast.success("Withdrawal approved and added to monthly settlement");
      fetchPendingWithdrawals();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      
      // Set font to helvetica for better compatibility
      doc.setFont('helvetica');
      
      // Add title
      doc.setFontSize(18);
      doc.text('Withdrawal Requests Report', 14, 15);
      
      // Add generation date
      doc.setFontSize(11);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
      
      // Prepare table data with plain numbers (no currency symbols)
      const tableData = pendingWithdrawals.map(w => {
        const withdrawalType = w.withdrawal_type || 'savings';
        const typeBalance = w.balances?.[withdrawalType] || 0;
        
        return [
          `${w.profiles?.first_name} ${w.profiles?.last_name}`,
          w.profiles?.member_number || '',
          withdrawalType.charAt(0).toUpperCase() + withdrawalType.slice(1),
          Number(w.amount).toFixed(2),
          typeBalance.toFixed(2),
          w.bank_name,
          w.account_number,
          w.account_name,
          w.status.charAt(0).toUpperCase() + w.status.slice(1),
          new Date(w.requested_at).toLocaleDateString()
        ];
      });
      
      // Add table with fixed column widths
      autoTable(doc, {
        head: [['Member Name', 'Member #', 'Type', 'Amount', 'Balance', 'Bank', 'Account #', 'Account Name', 'Status', 'Date']],
        body: tableData,
        startY: 28,
        styles: { 
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 2.5,
          lineWidth: 0.1,
          lineColor: [200, 200, 200],
          overflow: 'linebreak',
          valign: 'middle'
        },
        headStyles: { 
          fillColor: [0, 82, 204],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 30 }, // Member Name
          1: { cellWidth: 20 }, // Member #
          2: { cellWidth: 18 }, // Type
          3: { cellWidth: 24, fontStyle: 'bold', halign: 'right' }, // Amount
          4: { cellWidth: 24, halign: 'right' }, // Balance
          5: { cellWidth: 24 }, // Bank
          6: { cellWidth: 24 }, // Account #
          7: { cellWidth: 30 }, // Account Name
          8: { cellWidth: 18 }, // Status
          9: { cellWidth: 22 } // Date
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250]
        }
      });
      
      // Save PDF
      doc.save(`withdrawal-requests-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const exportToExcel = () => {
    try {
      const excelData = pendingWithdrawals.map(w => {
        const withdrawalType = w.withdrawal_type || 'savings';
        const typeBalance = w.balances?.[withdrawalType] || 0;
        
        return {
          'Member Name': `${w.profiles?.first_name} ${w.profiles?.last_name}`,
          'Member Number': w.profiles?.member_number || '',
          'Type': withdrawalType.charAt(0).toUpperCase() + withdrawalType.slice(1),
          'Amount': `₦${Number(w.amount).toLocaleString()}`,
          'Available Balance': `₦${typeBalance.toLocaleString()}`,
          'Bank Name': w.bank_name,
          'Account Number': w.account_number,
          'Account Name': w.account_name,
          'Status': w.status.charAt(0).toUpperCase() + w.status.slice(1),
          'Date Requested': new Date(w.requested_at).toLocaleDateString()
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Withdrawal Requests');
      
      // Set column widths
      worksheet['!cols'] = [
        { wch: 25 }, // Member Name
        { wch: 15 }, // Member Number
        { wch: 12 }, // Type
        { wch: 15 }, // Amount
        { wch: 18 }, // Available Balance
        { wch: 20 }, // Bank Name
        { wch: 18 }, // Account Number
        { wch: 25 }, // Account Name
        { wch: 12 }, // Status
        { wch: 15 }  // Date Requested
      ];

      XLSX.writeFile(workbook, `withdrawal-requests-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel file downloaded successfully');
    } catch (error: any) {
      console.error('Error generating Excel:', error);
      toast.error('Failed to generate Excel file');
    }
  };

  const completeWithdrawal = async (withdrawalId: string, memberId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', memberId)
        .single();

      if (!profile) throw new Error('Member not found');

      // Mark as completed (payment sent)
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', withdrawalId);

      if (updateError) throw updateError;

      // Send notification
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: profile.user_id,
          title: 'Withdrawal Completed',
          message: 'Your withdrawal has been processed successfully. Funds should reflect in your account within 1-3 business days.',
          type: 'withdrawal_status',
          related_id: withdrawalId
        });

      if (notifError) console.error('Failed to send notification:', notifError);
      
      toast.success("Withdrawal marked as completed and member notified");
      fetchPendingWithdrawals();
    } catch (error: any) {
      toast.error(error.message);
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
                <h1 className="text-3xl font-bold mb-2">Withdrawal Requests</h1>
                <p className="text-muted-foreground">
                  Review and process member withdrawal requests
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportToExcel} variant="outline" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Download Excel
                </Button>
                <Button onClick={exportToPDF} className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Requests ({pendingWithdrawals.length})</CardTitle>
                <CardDescription>
                  Approve, process and complete withdrawal payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingWithdrawals.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm sm:text-base">No pending withdrawals</p>
                ) : (
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Available Balance</TableHead>
                        <TableHead>Bank Details</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {pendingWithdrawals.map((withdrawal: any) => {
                        const withdrawalType = withdrawal.withdrawal_type || 'savings';
                        const typeBalance = withdrawal.balances?.[withdrawalType] || 0;
                        const hasSufficientBalance = withdrawal.amount <= typeBalance;
                        
                        return (
                        <TableRow key={withdrawal.id}>
                           <TableCell className="font-medium">
                             {withdrawal.profiles?.first_name} {withdrawal.profiles?.last_name}
                             <br />
                             <span className="text-xs text-muted-foreground">
                               {withdrawal.profiles?.member_number}
                             </span>
                             <br />
                             <Badge variant={withdrawal.status === 'approved' ? 'default' : 'secondary'} className="mt-1">
                               {withdrawal.status}
                             </Badge>
                           </TableCell>
                           <TableCell>
                             <Badge variant="outline" className="capitalize">
                               {withdrawalType}
                             </Badge>
                           </TableCell>
                          <TableCell className="font-bold text-lg">
                            ₦{Number(withdrawal.amount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className={`font-semibold ${hasSufficientBalance ? 'text-green-600' : 'text-red-600'}`}>
                                ₦{typeBalance.toLocaleString()}
                              </div>
                              {!hasSufficientBalance && (
                                <div className="flex items-center gap-1 text-xs text-red-600">
                                  <AlertCircle className="h-3 w-3" />
                                  Insufficient
                                </div>
                              )}
                              {hasSufficientBalance && (
                                <div className="text-xs text-green-600">
                                  ✓ Sufficient
                                </div>
                              )}
                            </div>
                          </TableCell>
                           <TableCell>
                             <div className="text-sm">
                               <div className="font-medium">{withdrawal.account_name}</div>
                               <div className="text-muted-foreground">{withdrawal.bank_name}</div>
                               <div className="font-mono">{withdrawal.account_number}</div>
                             </div>
                           </TableCell>
                           <TableCell>{new Date(withdrawal.requested_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right space-x-2">
                             {withdrawal.status === 'pending' && (
                               <Button
                                 size="sm"
                                 onClick={() => approveWithdrawal(withdrawal.id, withdrawal.member_id, withdrawal.amount, withdrawalType)}
                                 disabled={!hasSufficientBalance}
                               >
                                 <CheckCircle className="h-4 w-4 mr-1" />
                                 Approve
                               </Button>
                             )}
                             {withdrawal.status === 'approved' && (
                               <Button
                                 size="sm"
                                 variant="default"
                                 onClick={() => completeWithdrawal(withdrawal.id, withdrawal.member_id)}
                               >
                                 <CheckCircle className="h-4 w-4 mr-1" />
                                 Mark as Paid
                               </Button>
                             )}
                           </TableCell>
                         </TableRow>
                        );
                       })}
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

export default Withdrawals;
