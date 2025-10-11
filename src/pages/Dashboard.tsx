import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  TrendingUp, 
  PiggyBank, 
  Gift,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

const Dashboard = () => {
  // Mock data - will be replaced with real data from Supabase
  const memberData = {
    name: "John Doe",
    memberNumber: "WBC2024001",
    totalCapital: 320000,
    totalSavings: 80000,
    monthlyContribution: 5000,
    nextDividend: "June 2025",
    eligibleForDividend: true
  };

  const recentTransactions = [
    { id: 1, type: "contribution", amount: 5200, date: "2025-01-05", status: "completed" },
    { id: 2, type: "savings", amount: 1300, date: "2025-01-05", status: "completed" },
    { id: 3, type: "contribution", amount: 5200, date: "2024-12-05", status: "completed" },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {memberData.name}!</h1>
          <p className="text-white/80">Member ID: {memberData.memberNumber}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Capital */}
          <Card className="border-l-4 border-l-primary shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Capital
              </CardTitle>
              <Wallet className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                ₦{memberData.totalCapital.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                80% of contributions
              </p>
            </CardContent>
          </Card>

          {/* Total Savings */}
          <Card className="border-l-4 border-l-secondary shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Savings
              </CardTitle>
              <PiggyBank className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">
                ₦{memberData.totalSavings.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Available after 6 months
              </p>
            </CardContent>
          </Card>

          {/* Monthly Contribution */}
          <Card className="border-l-4 border-l-accent shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Monthly Contribution
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ₦{memberData.monthlyContribution.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                + ₦200 project support
              </p>
            </CardContent>
          </Card>

          {/* Next Dividend */}
          <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Next Dividend
              </CardTitle>
              <Gift className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {memberData.nextDividend}
              </div>
              <p className="text-xs text-green-600 mt-1">
                {memberData.eligibleForDividend ? "✓ Eligible" : "Not eligible yet"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <Card className="lg:col-span-2 shadow-md">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        transaction.type === "contribution" 
                          ? "bg-primary/10" 
                          : "bg-secondary/10"
                      }`}>
                        {transaction.type === "contribution" ? (
                          <ArrowUpRight className={`h-5 w-5 ${
                            transaction.type === "contribution" 
                              ? "text-primary" 
                              : "text-secondary"
                          }`} />
                        ) : (
                          <ArrowDownRight className="h-5 w-5 text-secondary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{transaction.type}</p>
                        <p className="text-sm text-muted-foreground">{transaction.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₦{transaction.amount.toLocaleString()}</p>
                      <p className="text-xs text-green-600 capitalize">{transaction.status}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                View All Transactions
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full gradient-primary text-white">
                Make Contribution
              </Button>
              <Button variant="outline" className="w-full">
                Request Withdrawal
              </Button>
              <Button variant="outline" className="w-full">
                View Dividend History
              </Button>
              <Button variant="outline" className="w-full">
                Update Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
