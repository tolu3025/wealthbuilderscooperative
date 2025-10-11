import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";

const Blog = () => {
  // Mock blog posts
  const posts = [
    {
      id: 1,
      title: "New Property Investment in Lekki Phase 2",
      excerpt: "We're excited to announce our latest investment opportunity in the heart of Lagos...",
      date: "2025-01-10",
      author: "Admin Team",
      category: "Investment",
    },
    {
      id: 2,
      title: "December Dividend Distribution Complete",
      excerpt: "All eligible members have received their dividend payments for Q4 2024...",
      date: "2025-01-05",
      author: "Finance Team",
      category: "Announcement",
    },
    {
      id: 3,
      title: "Understanding Your Capital Growth",
      excerpt: "Learn how your monthly contributions build wealth over time in our cooperative...",
      date: "2024-12-28",
      author: "Education Team",
      category: "Education",
    },
    {
      id: 4,
      title: "Welcome New Members - January 2025",
      excerpt: "We're thrilled to welcome 15 new members to the WealthBuilders family this month...",
      date: "2024-12-20",
      author: "Admin Team",
      category: "Community",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold mb-4">News & Announcements</h1>
            <p className="text-muted-foreground text-lg">
              Stay updated with the latest news and updates from WealthBuilders Cooperative
            </p>
          </div>

          <div className="space-y-6">
            {posts.map((post) => (
              <Card key={post.id} className="hover:shadow-elegant transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>{post.category}</Badge>
                  </div>
                  <CardTitle className="text-2xl mb-2">{post.title}</CardTitle>
                  <CardDescription className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(post.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {post.author}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                  <a
                    href={`#post-${post.id}`}
                    className="text-primary hover:underline font-semibold"
                  >
                    Read more →
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Blog;
