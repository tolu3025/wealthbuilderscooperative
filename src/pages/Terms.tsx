import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen pt-16 md:pt-20">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white py-16">
        <div className="container mx-auto px-4">
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
            Terms and Conditions
          </h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Wealth Builders in Properties Multi-Purpose Cooperative Society Ltd
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-4xl">
          
          {/* Article I: Membership */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="font-heading text-2xl text-primary">
                Article I: Membership
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg mb-2">1. Eligibility</h3>
                  <p className="text-muted-foreground">
                    Membership is open to individuals who are at least 18 years old and share the objectives and values of the Society.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">2. Membership Fee</h3>
                  <p className="text-muted-foreground">
                    A non-refundable fee of <span className="font-semibold text-foreground">₦5,000</span> is payable upon joining the Society.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">3. Monthly Contributions</h3>
                  <p className="text-muted-foreground">
                    Members are required to pay a minimum monthly contribution of <span className="font-semibold text-foreground">₦5,500</span> on or before the last Thursday of every month.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Article II: Capital Allocation */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="font-heading text-2xl text-primary">
                Article II: Capital Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-primary/5 p-4 rounded-lg">
                  <div className="flex items-start gap-3 mb-2">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg">1. 80% Capital</h3>
                      <p className="text-muted-foreground">
                        80% of members' contributions will be allocated towards property purchases.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-accent/5 p-4 rounded-lg">
                  <div className="flex items-start gap-3 mb-2">
                    <CheckCircle className="h-5 w-5 text-accent flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg">2. 20% Savings</h3>
                      <p className="text-muted-foreground">
                        20% of members' contributions will be allocated towards savings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Article III: Dividends and Withdrawals */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="font-heading text-2xl text-primary">
                Article III: Dividends and Withdrawals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg mb-2">1. Dividend Distribution</h3>
                  <p className="text-muted-foreground">
                    Dividends from property sales will be shared among members according to their 80% contribution capital share.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">2. Withdrawal of Dividends</h3>
                  <p className="text-muted-foreground">
                    Members can withdraw dividends at any time.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">3. Withdrawal of Contributed Capital</h3>
                  <p className="text-muted-foreground">
                    Members cannot withdraw their contributed capital.
                  </p>
                </div>
                <div className="bg-destructive/10 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">4. Fine</h3>
                      <p className="text-muted-foreground">
                        A fine of <span className="font-semibold text-foreground">₦500</span> will be charged for failure to pay monthly contributions or will be deducted from savings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Article IV: Governance and Operations */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="font-heading text-2xl text-primary">
                Article IV: Governance and Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg mb-2">1. Board of Trustees</h3>
                  <p className="text-muted-foreground">
                    The Society is guided by a Board of Trustees, which includes professionals from various fields.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">2. Board of Directors</h3>
                  <p className="text-muted-foreground">
                    The Board of Directors is responsible for making decisions, seeking funds, and ensuring transparency and accountability.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Article V: Property Transactions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="font-heading text-2xl text-primary">
                Article V: Property Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg mb-2">1. Property Purchase</h3>
                  <p className="text-muted-foreground">
                    The Society will purchase properties through a law firm that investigates property genuineness and certifies properties for purchase.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">2. Property Sale</h3>
                  <p className="text-muted-foreground">
                    The Society will sell properties through a real estate consulting firm that handles property buying, advertising, and selling worldwide.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Article VI: Financial Management */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="font-heading text-2xl text-primary">
                Article VI: Financial Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-lg mb-2">1. Auditing</h3>
                  <p className="text-muted-foreground">
                    The Society's financial transactions will be audited by an auditing firm.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">2. Accounting</h3>
                  <p className="text-muted-foreground">
                    The Society's accounts will be handled by an accounting firm.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Article VII: Dispute Resolution */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="font-heading text-2xl text-primary">
                Article VII: Dispute Resolution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <h3 className="font-semibold text-lg mb-2">1. Dispute Resolution Mechanism</h3>
                <p className="text-muted-foreground">
                  Any disputes arising from the interpretation of these terms and conditions will be resolved through arbitration by the Directors.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Article VIII: Amendments */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="font-heading text-2xl text-primary">
                Article VIII: Amendments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <h3 className="font-semibold text-lg mb-2">1. Amendments</h3>
                <p className="text-muted-foreground">
                  These terms and conditions may be amended by a two-thirds majority of the Directors present and voting at the Board meeting.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Article IX: Governing Law */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="font-heading text-2xl text-primary">
                Article IX: Governing Law
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <h3 className="font-semibold text-lg mb-2">1. Governing Law</h3>
                <p className="text-muted-foreground">
                  These terms and conditions will be governed by and construed in accordance with the laws of Nigeria.
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

export default Terms;
