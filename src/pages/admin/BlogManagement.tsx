import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileUpload } from "@/components/FileUpload";

const blogSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  excerpt: z.string().max(300).optional(),
  content: z.string().min(50, "Content must be at least 50 characters").max(10000),
  image_url: z.string().url().optional().or(z.literal("")),
  published: z.boolean()
});

type BlogFormData = z.infer<typeof blogSchema>;

interface BlogPost {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  image_url: string | null;
  published: boolean;
  created_at: string;
}

const BlogManagement = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [userId, setUserId] = useState<string>("");

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<BlogFormData>({
    resolver: zodResolver(blogSchema),
    defaultValues: { published: false }
  });

  useEffect(() => {
    fetchPosts();
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: BlogFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      const postData = {
        title: data.title,
        excerpt: data.excerpt || null,
        content: data.content,
        image_url: imageUrl || null,
        published: data.published,
        author_id: profile?.id
      };

      if (editing) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', editing);
        if (error) throw error;
        toast.success("Blog post updated successfully");
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert([postData]);
        if (error) throw error;
        toast.success("Blog post created successfully");
      }

      reset();
      setEditing(null);
      setImageUrl("");
      fetchPosts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditing(post.id);
    setValue('title', post.title);
    setValue('excerpt', post.excerpt || '');
    setValue('content', post.content);
    setValue('image_url', post.image_url || '');
    setValue('published', post.published);
    setImageUrl(post.image_url || '');
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Post deleted successfully");
      fetchPosts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
    setValue('image_url', url);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Blog Management</h1>
            <p className="text-muted-foreground">Create and manage blog posts</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Create/Edit Form */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{editing ? "Edit Post" : "Create New Post"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input id="title" {...register("title")} />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea id="excerpt" {...register("excerpt")} rows={3} />
                  {errors.excerpt && (
                    <p className="text-sm text-destructive">{errors.excerpt.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea id="content" {...register("content")} rows={8} />
                  {errors.content && (
                    <p className="text-sm text-destructive">{errors.content.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Featured Image</Label>
                  {userId && (
                    <FileUpload
                      userId={userId}
                      fileType="blog-image"
                      bucket="blog-images"
                      label="Upload Featured Image (JPG, PNG, or PDF)"
                      onUploadComplete={handleImageUpload}
                    />
                  )}
                  {imageUrl && (
                    <img src={imageUrl} alt="Preview" className="mt-2 rounded-lg w-full h-32 object-cover" />
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="published"
                    onCheckedChange={(checked) => setValue('published', checked)}
                  />
                  <Label htmlFor="published">Publish immediately</Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editing ? "Update" : "Create"} Post
                  </Button>
                  {editing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditing(null);
                        reset();
                        setImageUrl("");
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Posts List */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>All Posts ({posts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading posts...</p>
              ) : posts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No posts yet. Create your first post!</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium">{post.title}</TableCell>
                        <TableCell>
                          <Badge variant={post.published ? "default" : "secondary"}>
                            {post.published ? "Published" : "Draft"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(post.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(post)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(post.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BlogManagement;
