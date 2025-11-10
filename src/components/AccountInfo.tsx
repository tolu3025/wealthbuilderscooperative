import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CreditCard, User } from "lucide-react";
import { CopyPhoneButton } from "./CopyPhoneButton";

const AccountInfo = () => {
  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Payment Information
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
              Use these account details for your contributions and registration fees
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Contribution Account */}
            <Card className="border-2 hover:border-primary/50 transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Monthly Contribution Account
                </CardTitle>
                <CardDescription>
                  For ₦5,000 monthly contributions (capital + savings)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Bank Name</p>
                  <p className="font-semibold">FCMB</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Account Number</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">1042529824</p>
                    <CopyPhoneButton phoneNumber="1042529824" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Account Name</p>
                  <p className="font-semibold text-sm">ORISUNBARE (OSG) WEALTH BUILDERS IN PROPT MCSL</p>
                </div>
              </CardContent>
            </Card>

            {/* Registration Account */}
            <Card className="border-2 hover:border-secondary/50 transition-all">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-secondary" />
                  Registration Fee Account
                </CardTitle>
                <CardDescription>
                  For one-time ₦5,000 registration fee
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Bank Name</p>
                  <p className="font-semibold">Alpha Morgan Bank</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Account Number</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">2010006769</p>
                    <CopyPhoneButton phoneNumber="2010006769" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Account Name</p>
                  <p className="font-semibold text-sm">WEALTH BUILDERS IN PROPERTIES MULTIPURPOSE COOPERATIVE LTD</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AccountInfo;
