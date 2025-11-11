import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { FileUpload } from "@/components/FileUpload";

const Properties = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    purchase_price: "",
    current_value: "",
    status: "active",
    image_url: ""
  });

  useEffect(() => {
    fetchProperties();
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  };

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const propertyData = {
        ...formData,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        current_value: formData.current_value ? parseFloat(formData.current_value) : null,
      };

      if (editing) {
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', editing);
        if (error) throw error;
        toast.success("Property updated successfully");
      } else {
        const { error } = await supabase
          .from('properties')
          .insert([propertyData]);
        if (error) throw error;
        toast.success("Property added successfully");
      }

      resetForm();
      fetchProperties();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (property: any) => {
    setEditing(property.id);
    setFormData({
      name: property.name,
      description: property.description || "",
      location: property.location || "",
      purchase_price: property.purchase_price?.toString() || "",
      current_value: property.current_value?.toString() || "",
      status: property.status,
      image_url: property.image_url || ""
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this property?")) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Property deleted successfully");
      fetchProperties();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      name: "",
      description: "",
      location: "",
      purchase_price: "",
      current_value: "",
      status: "active",
      image_url: ""
    });
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AdminSidebar />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardHeader userName="Admin" />
          <main className="flex-1 p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 overflow-x-hidden">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
                <Building2 className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
                Property Management
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Add and manage cooperative properties
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>{editing ? "Edit Property" : "Add New Property"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Property Name *</Label>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Purchase Price (₦)</Label>
                      <Input
                        type="number"
                        value={formData.purchase_price}
                        onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Current Value (₦)</Label>
                      <Input
                        type="number"
                        value={formData.current_value}
                        onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="sold">Sold</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Property Image</Label>
                      {userId && (
                        <FileUpload
                          userId={userId}
                          fileType="property-image"
                          bucket="property-images"
                          label="Upload Property Image (JPG, PNG, or PDF)"
                          onUploadComplete={(url) => setFormData({ ...formData, image_url: url })}
                        />
                      )}
                      {formData.image_url && (
                        <img src={formData.image_url} alt="Preview" className="mt-2 rounded-lg w-full h-32 object-cover" />
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editing ? "Update" : "Add"} Property
                      </Button>
                      {editing && (
                        <Button type="button" variant="outline" onClick={resetForm}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>All Properties ({properties.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {properties.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm sm:text-base">No properties yet</p>
                  ) : (
                    <div className="overflow-x-auto -mx-3 sm:mx-0">
                      <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Purchase Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {properties.map((prop) => (
                          <TableRow key={prop.id}>
                            <TableCell className="font-medium">{prop.name}</TableCell>
                            <TableCell>{prop.location}</TableCell>
                            <TableCell>₦{Number(prop.purchase_price || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={prop.status === 'active' ? 'default' : 'secondary'}>
                                {prop.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(prop)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(prop.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                       ))}
                      </TableBody>
                    </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Properties;
