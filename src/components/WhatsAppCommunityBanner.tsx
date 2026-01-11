import { MessageCircle, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP_GROUP_LINK = "https://chat.whatsapp.com/FHq5NwI8czS2qTiCZE6J02";

export function WhatsAppCommunityBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#25D366] via-[#128C7E] to-[#075E54] p-4 sm:p-6 shadow-lg">
      {/* Decorative elements */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
      
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Join Our Community
              <Users className="h-4 w-4 text-white/80" />
            </h3>
            <p className="text-xs sm:text-sm text-white/90">
              Connect with fellow members on WhatsApp
            </p>
          </div>
        </div>
        
        <Button
          asChild
          className="w-full sm:w-auto bg-white hover:bg-white/90 text-[#128C7E] font-semibold shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg"
        >
          <a
            href={WHATSAPP_GROUP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2"
          >
            <span>Join Group</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
