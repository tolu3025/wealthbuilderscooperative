import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  image_url: string | null;
  created_at: string;
  author: {
    first_name: string;
    last_name: string;
  } | null;
}

const Blog = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select(`
            id,
            title,
            excerpt,
            content,
            image_url,
            created_at,
            author:profiles(first_name, last_name)
          `)
          .eq('published', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPosts(data || []);
      } catch (error) {
        console.error('Error fetching blog posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold mb-4">News & Announcements</h1>
            <p className="text-muted-foreground text-lg">
              Stay updated with the latest news and updates from WealthBuilders Cooperative
            </p>
          </div>

          <div className="space-y-8">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i}>
                  <div className="md:flex">
                    <Skeleton className="h-48 md:h-auto md:w-64 rounded-t-lg md:rounded-l-lg md:rounded-t-none" />
                    <div className="flex-1 p-6">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-48 mb-4" />
                      <Skeleton className="h-16 w-full mb-4" />
                      <Skeleton className="h-10 w-32" />
                    </div>
                  </div>
                </Card>
              ))
            ) : posts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground text-lg">
                    No blog posts available at the moment. Check back soon!
                  </p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <Card 
                  key={post.id} 
                  className="hover:shadow-elegant transition-shadow overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/blog/${post.id}`)}
                >
                  <div className="md:flex">
                    {post.image_url ? (
                      <div className="md:w-64 md:flex-shrink-0">
                        <img 
                          src={post.image_url} 
                          alt={post.title}
                          className="w-full h-48 md:h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="md:w-64 md:flex-shrink-0 bg-muted flex items-center justify-center h-48 md:h-auto">
                        <span className="text-muted-foreground text-sm">No Image</span>
                      </div>
                    )}
                    <div className="flex-1 p-6">
                      <CardTitle className="text-xl mb-2 line-clamp-2">{post.title}</CardTitle>
                      <CardDescription className="flex items-center gap-4 text-sm mb-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(post.created_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {post.author && (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {post.author.first_name} {post.author.last_name}
                          </span>
                        )}
                      </CardDescription>
                      <p className="text-muted-foreground mb-4 line-clamp-3">
                        {post.excerpt || post.content.substring(0, 150) + '...'}
                      </p>
                      <Button variant="outline" size="sm">
                        Read More
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Blog;
