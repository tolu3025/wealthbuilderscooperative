import { useEffect, useState } from "react";
import { X, Megaphone } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export const AnnouncementBanner = () => {
  const [announcement, setAnnouncement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnnouncement();
  }, []);

  const fetchAnnouncement = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get latest published post marked as banner
      const { data: post, error: postError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .eq('show_as_banner', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (postError || !post) {
        setLoading(false);
        return;
      }

      // Check if user has dismissed this announcement
      const { data: dismissed } = await supabase
        .from('dismissed_announcements')
        .select('id')
        .eq('user_id', user.id)
        .eq('blog_post_id', post.id)
        .single();

      if (!dismissed) {
        setAnnouncement(post);
      }
    } catch (error) {
      console.error('Error fetching announcement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (!announcement) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('dismissed_announcements').insert({
        user_id: user.id,
        blog_post_id: announcement.id,
      });

      setAnnouncement(null);
    } catch (error) {
      console.error('Error dismissing announcement:', error);
    }
  };

  if (loading || !announcement) return null;

  return (
    <Alert className="mb-4 border-primary/50 bg-primary/5">
      <Megaphone className="h-5 w-5 text-primary" />
      <AlertTitle className="flex items-center justify-between pr-8">
        {announcement.title}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm mb-3 line-clamp-2">{announcement.excerpt || announcement.content.substring(0, 150) + '...'}</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('/blog')}
          >
            View Details
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4 mr-1" />
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
