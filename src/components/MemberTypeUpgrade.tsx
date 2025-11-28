import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowUpRight, Info, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileUpload } from "@/components/FileUpload";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface MemberTypeUpgradeProps {
  currentMemberType: string;
  profileId: string;
  onUpgradeComplete: () => void;
}

export const MemberTypeUpgrade = ({ 
  currentMemberType, 
  profileId,
  onUpgradeComplete 
}: MemberTypeUpgradeProps) => {
  const [loading, setLoading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [breakdownType, setBreakdownType] = useState<"80_20" | "100_capital">("80_20");
  const [authUserId, setAuthUserId] = useState<string>("");
  const { toast } = useToast();

  // Only show to acting members
  if (currentMemberType !== "acting_member") {
    return null;
  }

  // Get auth user ID on component mount
  useEffect(() => {
    const getAuthUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setAuthUserId(user.id);
    };
    getAuthUser();
  }, []);

  const handleUpgrade = async () => {
    if (!receiptUrl) {
      toast({
        title: "Receipt Required",
        description: "Please upload your payment receipt first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Submit upgrade request for admin verification
      const { error: requestError } = await supabase
        .from('member_upgrade_requests')
        .insert({
          member_id: profileId,
          breakdown_type: breakdownType,
          receipt_url: receiptUrl,
          status: 'pending',
        });

      if (requestError) throw requestError;

      toast({
        title: "Upgrade Request Submitted!",
        description: "Your upgrade request has been submitted for admin verification. You'll be notified once approved.",
      });

      onUpgradeComplete();
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit upgrade request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-primary shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5 text-primary" />
          Upgrade to Full Member
        </CardTitle>
        <CardDescription>
          Unlock dividend benefits and build wealth with our investment program
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            As an Acting Member, you're currently paying ₦500/month. Upgrade to Full Member to:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Contribute ₦5,500 monthly (₦5,000 investment + ₦500 support)</li>
              <li>Qualify for property dividend distributions</li>
              <li>Build capital and savings for wealth creation</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h4 className="font-semibold mb-3">Choose Your Contribution Breakdown</h4>
          <RadioGroup value={breakdownType} onValueChange={(value) => setBreakdownType(value as "80_20" | "100_capital")}>
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="80_20" id="80_20" />
              <Label htmlFor="80_20" className="cursor-pointer flex-1">
                <div className="font-medium">80/20 Split</div>
                <div className="text-sm text-muted-foreground">₦4,000 capital + ₦1,000 savings</div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="100_capital" id="100_capital" />
              <Label htmlFor="100_capital" className="cursor-pointer flex-1">
                <div className="font-medium">100% Capital</div>
                <div className="text-sm text-muted-foreground">₦5,000 capital + ₦0 savings</div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h4 className="font-semibold mb-3">Payment Information</h4>
          <p className="text-sm text-muted-foreground mb-2">
            Bank: <span className="font-medium text-foreground">Moniepoint MFB</span>
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            Account Name: <span className="font-medium text-foreground">WealthBuilders Cooperative</span>
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            Account Number: <span className="font-medium text-foreground">8173684916</span>
          </p>
          <p className="text-sm font-semibold text-primary mt-2">
            Amount: ₦5,500
          </p>
        </div>

        <div>
          <Label className="mb-2 block">Upload Payment Receipt</Label>
          {authUserId && (
            <FileUpload
              userId={authUserId}
              onUploadComplete={(url) => setReceiptUrl(url)}
              bucket="payment-receipts"
              fileType="upgrade"
            />
          )}
          {receiptUrl && (
            <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Receipt uploaded successfully
            </div>
          )}
        </div>

        <Button 
          onClick={handleUpgrade} 
          disabled={loading || !receiptUrl}
          className="w-full"
          size="lg"
        >
          {loading ? "Submitting..." : "Submit for Verification"}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Your request will be reviewed by an admin before your account is upgraded
        </p>
      </CardContent>
    </Card>
  );
};
