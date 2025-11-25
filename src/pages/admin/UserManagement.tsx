import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, ShieldOff, Loader2, Search, Plus, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Input } from "@/components/ui/input";
import { CopyPhoneButton } from "@/components/CopyPhoneButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserWithRole {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  member_number: string;
  registration_status: string;
  state: string;
  phone: string;
  created_at: string;
  user_id: string;
  roles: string[];
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles with non-null user_id
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .not('user_id', 'is', null)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with their roles
      const usersWithRoles = profiles?.map(profile => {
        const roles = userRoles?.filter(ur => ur.user_id === profile.user_id).map(ur => ur.role) || [];
        return {
          ...profile,
          roles,
        };
      });

      setUsers(usersWithRoles || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const addRole = async (userId: string, role: string, userName: string) => {
    try {
      // Validate role
      const validRoles = ['admin', 'member', 'state_rep', 'director'];
      if (!validRoles.includes(role)) {
        throw new Error("Invalid role");
      }

      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role: role as any }]);

      if (error) throw error;

      toast.success(`${role} role added to ${userName}`);
      fetchUsers();
    } catch (error: any) {
      toast.error("Failed to add role: " + error.message);
    }
  };

  const removeRole = async (userId: string, role: string, userName: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as any);

      if (error) throw error;

      toast.success(`${role} role removed from ${userName}`);
      fetchUsers();
    } catch (error: any) {
      toast.error("Failed to remove role: " + error.message);
    }
  };

  const deleteAccount = async (profileId: string, userId: string, userName: string) => {
    try {
      // Delete profile (this will cascade to other tables due to foreign keys)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (profileError) throw profileError;

      // Delete user roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesError) throw rolesError;

      toast.success(`Account deleted: ${userName}`);
      fetchUsers();
    } catch (error: any) {
      toast.error("Failed to delete account: " + error.message);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUserId || !newPassword) {
      toast.error("Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setResettingPassword(true);

    try {
      const { error } = await supabase.auth.admin.updateUserById(
        resetPasswordUserId,
        { password: newPassword }
      );

      if (error) throw error;

      toast.success("Password reset successfully");
      setResetPasswordUserId(null);
      setNewPassword("");
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Failed to reset password");
    } finally {
      setResettingPassword(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      user.first_name.toLowerCase().includes(query) ||
      user.last_name.toLowerCase().includes(query) ||
      user.member_number?.toLowerCase().includes(query)
    );
  });

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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">User Management</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Manage user accounts and admin roles
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg md:text-xl">
                  All Users ({users.length})
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  View, search, and manage user accounts
                </CardDescription>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or member number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {filteredUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm sm:text-base">
                    {searchQuery ? "No users found matching your search" : "No users found"}
                  </p>
                ) : (
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Member #</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Roles</TableHead>
                          <TableHead>Registered</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.first_name} {user.last_name}
                            </TableCell>
                            <TableCell className="text-sm">{user.email}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{user.phone}</span>
                                {user.phone && <CopyPhoneButton phoneNumber={user.phone} />}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{user.member_number || 'N/A'}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{user.state}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={user.registration_status === 'active' ? 'default' : 'secondary'}
                              >
                                {user.registration_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 flex-wrap items-center">
                                {user.roles.map((role) => (
                                  <Badge 
                                    key={role} 
                                    variant={role === 'admin' ? 'destructive' : 'secondary'}
                                    className="text-xs cursor-pointer hover:opacity-80"
                                    onClick={() => removeRole(user.user_id, role, `${user.first_name} ${user.last_name}`)}
                                  >
                                    {role} ×
                                  </Badge>
                                ))}
                                <Select
                                  onValueChange={(role) => addRole(user.user_id, role, `${user.first_name} ${user.last_name}`)}
                                >
                                  <SelectTrigger className="h-6 w-[100px] text-xs">
                                    <Plus className="h-3 w-3 mr-1" />
                                    <SelectValue placeholder="Add" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background">
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="state_rep">State Rep</SelectItem>
                                    <SelectItem value="director">Director</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {new Date(user.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Dialog open={resetPasswordUserId === user.user_id} onOpenChange={(open) => {
                                  if (!open) {
                                    setResetPasswordUserId(null);
                                    setNewPassword("");
                                  }
                                }}>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setResetPasswordUserId(user.user_id)}
                                    >
                                      <KeyRound className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Reset Password</DialogTitle>
                                      <DialogDescription>
                                        Set a new password for {user.first_name} {user.last_name}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="newPassword">New Password</Label>
                                        <Input
                                          id="newPassword"
                                          type="password"
                                          value={newPassword}
                                          onChange={(e) => setNewPassword(e.target.value)}
                                          placeholder="Enter new password (min. 6 characters)"
                                          disabled={resettingPassword}
                                        />
                                      </div>
                                      <Button
                                        onClick={handleResetPassword}
                                        disabled={resettingPassword}
                                        className="w-full"
                                      >
                                        {resettingPassword ? "Resetting..." : "Reset Password"}
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete the account for {user.first_name} {user.last_name}? 
                                          This action cannot be undone and will remove all their data including contributions, 
                                          dividends, and invites.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteAccount(user.id, user.user_id, `${user.first_name} ${user.last_name}`)}
                                        className="bg-destructive hover:bg-destructive/90"
                                      >
                                        Delete Account
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default UserManagement;
