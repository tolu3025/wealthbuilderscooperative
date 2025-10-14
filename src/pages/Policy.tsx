import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, Banknote, TrendingUp, FileCheck, AlertTriangle } from "lucide-react";

const Policy = () => {
  return (
    <div className="min-h-screen pt-16 md:pt-20">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <Shield className="h-12 w-12" />
            <h1 className="font-heading text-4xl md:text-5xl font-bold">
              Our Policy
            </h1>
          </div>
          <p className="text-xl text-white/90 max-w-2xl">
            Understanding the principles and guidelines that govern our cooperative society
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          
          {/* Key Aspects */}
          <Card className="mb-8 border-primary/20">
            <CardHeader className="bg-primary/5">
              <CardTitle className="font-heading text-2xl text-primary flex items-center gap-3">
                <FileCheck className="h-6 w-6" />
                Key Aspects of Membership
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <Users className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Age Requirement</h3>
                    <p className="text-muted-foreground">
                      Membership is open to individuals who are at least <span className="font-semibold text-foreground">18 years old</span>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <Banknote className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Financial Commitment</h3>
                    <p className="text-muted-foreground">
                      Members pay a non-refundable fee of <span className="font-semibold text-foreground">₦5,000</span> to join and a minimum monthly contribution of <span className="font-semibold text-foreground">₦5,500</span>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Capital Allocation</h3>
                    <p className="text-muted-foreground mb-3">
                      Contributions are strategically split to maximize growth and security:
                    </p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="bg-primary/10 p-3 rounded-md">
                        <p className="font-semibold text-primary mb-1">80% Capital</p>
                        <p className="text-sm text-muted-foreground">Allocated for property purchases</p>
                      </div>
                      <div className="bg-accent/10 p-3 rounded-md">
                        <p className="font-semibold text-accent mb-1">20% Savings</p>
                        <p className="text-sm text-muted-foreground">Reserved for member savings</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Capital Protection</h3>
                    <p className="text-muted-foreground">
                      Members can earn dividends from property sales, which are shared according to their 80% contribution capital share. While dividends can be withdrawn at any time, <span className="font-semibold text-foreground">contributed capital cannot be withdrawn</span> to ensure the stability and growth of the cooperative.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefits */}
          <Card className="mb-8 border-accent/20">
            <CardHeader className="bg-accent/5">
              <CardTitle className="font-heading text-2xl text-accent flex items-center gap-3">
                <TrendingUp className="h-6 w-6" />
                Member Benefits
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Global Property Access</h3>
                  <p className="text-muted-foreground">
                    Members can benefit from property sales worldwide, expanding investment opportunities beyond local markets.
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-accent/5 to-accent/10 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Transparent Transactions</h3>
                  <p className="text-muted-foreground">
                    The Society ensures genuine, profitable, and transparent property transactions through verified partners.
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Multiple Income Streams</h3>
                  <p className="text-muted-foreground">
                    Members can earn dividends from multiple property sales, creating diverse revenue opportunities.
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-accent/5 to-accent/10 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">Emergency Savings Access</h3>
                  <p className="text-muted-foreground">
                    Members have access to their 20% savings at any time for emergency needs after 6 months of contribution.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Notice */}
          <Card className="border-destructive/20">
            <CardHeader className="bg-destructive/5">
              <CardTitle className="font-heading text-xl text-destructive flex items-center gap-3">
                <AlertTriangle className="h-6 w-6" />
                Important Notice
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Payment Deadline:</span> Monthly contributions of ₦5,500 must be paid on or before the last Thursday of every month.
                </p>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Late Payment Fine:</span> A fine of ₦500 will be charged for failure to pay monthly contributions on time, or will be automatically deducted from your savings account.
                </p>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Capital Commitment:</span> All capital contributions (80% of monthly payments) are locked and cannot be withdrawn. This ensures the cooperative's ability to make strategic property investments.
                </p>
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">Savings Access:</span> The 20% savings portion becomes accessible after 6 months of continuous contribution for emergency withdrawals.
                </p>
              </div>
            </CardContent>
          </Card>

        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Policy;
