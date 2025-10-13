import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface CopyPhoneButtonProps {
  phoneNumber: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
}

export const CopyPhoneButton = ({ 
  phoneNumber, 
  size = "icon", 
  variant = "ghost" 
}: CopyPhoneButtonProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Phone number copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy phone number",
        variant: "destructive",
      });
    }
  };

  return (
    <Button 
      size={size} 
      variant={variant} 
      onClick={handleCopy}
      className="transition-all"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
};
