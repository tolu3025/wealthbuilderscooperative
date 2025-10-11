import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { NIGERIAN_STATES } from "@/lib/nigerianStates";

const StateReps = () => {
  const [stateReps, setStateReps] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    state: "",
    rep_profile_id: "",
    whatsapp_number: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: repsData, error: repsError } = await supabase
        .from('state_representatives')
        .select(`
          *,
          profiles!state_representatives_rep_profile_id_fkey(first_name, last_name, email)
        `)
        .order('state');

      if (repsError) throw repsError;
      setStateReps(repsData || []);

      const { data: membersData, error: membersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name');

      if (membersError) throw membersError;
      setMembers(membersData || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editing) {
        const { error } = await supabase
          .from('state_representatives')
          .update(formData)
          .eq('id', editing);
        if (error) throw error;
        toast.success("State representative updated successfully");
      } else {
        const { error } = await supabase
          .from('state_representatives')
          .insert([formData]);
        if (error) throw error;
        toast.success("State representative added successfully");
      }

      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (rep: any) => {
    setEditing(rep.id);
    setFormData({
      state: rep.state,
      rep_profile_id: rep.rep_profile_id || "",
      whatsapp_number: rep.whatsapp_number || ""
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this state representative?")) return;

    try {
      const { error } = await supabase
        .from('state_representatives')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("State representative removed successfully");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      state: "",
      rep_profile_id: "",
      whatsapp_number: ""
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
                <UserCheck className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
                State Representatives
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Assign and manage state representatives
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle>{editing ? "Edit Representative" : "Add New Representative"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>State *</Label>
                      <Select required value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {NIGERIAN_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Representative Member *</Label>
                      <Select required value={formData.rep_profile_id} onValueChange={(value) => setFormData({ ...formData, rep_profile_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select member" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.first_name} {member.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>WhatsApp Number</Label>
                      <Input
                        placeholder="+234 xxx xxx xxxx"
                        value={formData.whatsapp_number}
                        onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editing ? "Update" : "Add"} Representative
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
                  <CardTitle>All State Representatives ({stateReps.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {stateReps.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm sm:text-base">No state representatives yet</p>
                  ) : (
                    <div className="overflow-x-auto -mx-3 sm:mx-0">
                      <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>State</TableHead>
                          <TableHead>Representative</TableHead>
                          <TableHead>WhatsApp</TableHead>
                          <TableHead>Assigned Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stateReps.map((rep) => (
                          <TableRow key={rep.id}>
                            <TableCell>
                              <Badge variant="outline">{rep.state}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">
                              {rep.profiles?.first_name} {rep.profiles?.last_name}
                              <br />
                              <span className="text-xs text-muted-foreground">
                                {rep.profiles?.email}
                              </span>
                            </TableCell>
                            <TableCell>{rep.whatsapp_number || "—"}</TableCell>
                            <TableCell>{new Date(rep.assigned_date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(rep)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(rep.id)}>
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

export default StateReps;
