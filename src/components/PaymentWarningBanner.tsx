import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const PaymentWarningBanner = () => {
  return (
    <Alert className="mb-4 border-red-500 bg-red-50 dark:bg-red-950/20">
      <AlertTriangle className="h-5 w-5 text-red-600" />
      <AlertDescription className="text-red-900 dark:text-red-100">
        <span className="font-bold">🔥 Warning:</span> Always pay to the co-op account listed on the website. 
        Pay through your personal bank accounts bearing your name, any third party payment won't be credited to your account.
      </AlertDescription>
    </Alert>
  );
};
