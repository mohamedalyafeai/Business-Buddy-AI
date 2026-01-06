import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Shield, Trash2, Loader2, UserPlus, Search, UserMinus, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { createAuditLog } from "@/lib/auditLog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: string | null;
  created_at: string;
}

export const AdminUserManagement = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [addingRole, setAddingRole] = useState<string | null>(null);
  const [removingRole, setRemovingRole] = useState<string | null>(null);
  const [newRoleUser, setNewRoleUser] = useState("");
  const [newRole, setNewRole] = useState<string>("user");
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, created_at");

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          email: "", // We don't have access to auth.users email
          display_name: profile.display_name,
          role: userRole?.role || null,
          created_at: profile.created_at,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async (userId: string, role: string) => {
    setAddingRole(userId);
    try {
      // First try to update existing role
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id, role")
        .eq("user_id", userId)
        .maybeSingle();

      const previousRole = existing?.role || null;

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("user_roles")
          .update({ role: role as "admin" | "moderator" | "user" })
          .eq("user_id", userId);
        if (error) throw error;

        // Log role update
        await createAuditLog({
          action: "role_updated",
          entity_type: "user_role",
          entity_id: userId,
          details: { previous_role: previousRole, new_role: role },
        });
      } else {
        // Insert new
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: role as "admin" | "moderator" | "user" });
        if (error) throw error;

        // Log role addition
        await createAuditLog({
          action: "role_added",
          entity_type: "user_role",
          entity_id: userId,
          details: { role },
        });
      }

      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role } : u))
      );
      toast.success(`Role updated to ${role}`);
    } catch (error) {
      console.error("Error adding role:", error);
      toast.error("Failed to update role");
    } finally {
      setAddingRole(null);
    }
  };

  const handleRemoveRole = async (userId: string) => {
    setRemovingRole(userId);
    try {
      const user = users.find((u) => u.user_id === userId);
      const previousRole = user?.role;

      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      // Log role removal
      await createAuditLog({
        action: "role_removed",
        entity_type: "user_role",
        entity_id: userId,
        details: { previous_role: previousRole || "none" },
      });

      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role: null } : u))
      );
      toast.success("Role removed");
    } catch (error) {
      console.error("Error removing role:", error);
      toast.error("Failed to remove role");
    } finally {
      setRemovingRole(null);
    }
  };

  const handleDeleteUser = async (userId: string, displayName: string | null) => {
    setDeletingUser(userId);
    try {
      // Delete user's chat messages
      await supabase
        .from("chat_messages")
        .delete()
        .eq("user_id", userId);

      // Delete user's chat conversations
      await supabase
        .from("chat_conversations")
        .delete()
        .eq("user_id", userId);

      // Delete user's workflows
      await supabase
        .from("workflows")
        .delete()
        .eq("user_id", userId);

      // Delete user's role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Delete user's profile
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      // Log user deletion
      await createAuditLog({
        action: "user_deleted",
        entity_type: "user",
        entity_id: userId,
        details: { display_name: displayName || "Unknown" },
      });

      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
      toast.success("User data deleted successfully");
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("Failed to delete user data");
    } finally {
      setDeletingUser(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.user_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "moderator":
        return "default";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user roles and permissions across the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
              <div className="text-xl sm:text-2xl font-bold text-foreground">{users.length}</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Total Users</div>
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {users.filter((u) => u.role === "admin").length}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Admins</div>
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {users.filter((u) => u.role === "moderator").length}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Moderators</div>
            </div>
            <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
              <div className="text-xl sm:text-2xl font-bold text-foreground">
                {users.filter((u) => u.role === "user").length}
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground">Regular Users</div>
            </div>
          </div>

          {/* User List */}
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground truncate">
                        {user.display_name || "Unknown User"}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        Joined {format(new Date(user.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                    <Badge variant={getRoleBadgeVariant(user.role)} className="sm:hidden flex-shrink-0">
                      {user.role || "No Role"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 justify-end">
                    <Badge variant={getRoleBadgeVariant(user.role)} className="hidden sm:inline-flex">
                      {user.role || "No Role"}
                    </Badge>
                    <Select
                      value={user.role || "none"}
                      onValueChange={(value) => {
                        if (value === "none") {
                          handleRemoveRole(user.user_id);
                        } else {
                          handleAddRole(user.user_id, value);
                        }
                      }}
                      disabled={addingRole === user.user_id || removingRole === user.user_id}
                    >
                      <SelectTrigger className="w-24 sm:w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Role</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Delete User */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive flex-shrink-0"
                          disabled={deletingUser === user.user_id}
                        >
                          {deletingUser === user.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User Data</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete all data for "{user.display_name || "Unknown User"}" including their conversations, workflows, and profile. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteUser(user.user_id, user.display_name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
