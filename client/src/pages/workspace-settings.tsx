import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, UserPlus, Users, Crown, Shield, User, Eye, Trash2, Mail } from "lucide-react";
import { useWorkspace, useWorkspaceMembers, useWorkspaceInvites, useInviteMember, useUpdateMemberRole, useRemoveMember } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

const roleIcons: Record<string, any> = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const roleColors: Record<string, string> = {
  owner: "bg-violet-50 text-violet-700 border-violet-200",
  admin: "bg-purple-50 text-purple-700 border-purple-200",
  member: "bg-indigo-50 text-indigo-700 border-indigo-200",
  viewer: "bg-muted text-muted-foreground border-border",
};

export default function WorkspaceSettingsPage({ workspaceId }: { workspaceId: string }) {
  const { user } = useStore();
  const { toast } = useToast();
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(workspaceId);
  const { data: members = [], isLoading: membersLoading } = useWorkspaceMembers(workspaceId);
  const { data: invites = [] } = useWorkspaceInvites(workspaceId);
  const inviteMember = useInviteMember();
  const updateMemberRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const currentMember = members.find((m: any) => m.userId === user.id);
  const canManageMembers = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await inviteMember.mutateAsync({ workspaceId, email: inviteEmail, role: inviteRole });
      toast({ title: "Invite sent", description: `Invitation sent to ${inviteEmail}` });
      setInviteEmail("");
      setInviteOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to send invite", variant: "destructive" });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateMemberRole.mutateAsync({ workspaceId, memberId, role: newRole });
      toast({ title: "Role updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeMember.mutateAsync({ workspaceId, memberId });
      toast({ title: "Member removed" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove member", variant: "destructive" });
    }
  };

  if (workspaceLoading || membersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">{workspace?.name}</h2>
        <p className="text-muted-foreground">Manage workspace members and permissions.</p>
      </div>

      <Card className="bg-card border-border rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg text-foreground">Members</CardTitle>
            <CardDescription className="text-muted-foreground">{members.length} members</CardDescription>
          </div>
          {canManageMembers && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90" data-testid="button-invite-member">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-xl">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Invite Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Email</Label>
                    <Input
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="rounded-xl border-border"
                      data-testid="input-invite-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger className="rounded-xl border-border" data-testid="select-invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={handleInvite} 
                    disabled={!inviteEmail.trim() || inviteMember.isPending}
                    className="w-full rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
                    data-testid="button-send-invite"
                  >
                    {inviteMember.isPending ? "Sending..." : "Send Invite"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member: any) => {
            const RoleIcon = roleIcons[member.role] || User;
            const isCurrentUser = member.userId === user.id;
            const isOwner = member.role === 'owner';

            return (
              <div 
                key={member.id} 
                className="flex items-center justify-between p-3 rounded-xl bg-muted border border-border"
                data-testid={`member-${member.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-medium">
                    {member.user?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {member.user?.name || member.user?.email}
                      {isCurrentUser && <span className="text-muted-foreground text-sm ml-2">(you)</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManageMembers && !isOwner && !isCurrentUser ? (
                    <Select value={member.role} onValueChange={(role) => handleRoleChange(member.id, role)}>
                      <SelectTrigger className={`rounded-full border ${roleColors[member.role]} w-28`}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={`rounded-full capitalize ${roleColors[member.role]}`}>
                      <RoleIcon className="h-3 w-3 mr-1" />
                      {member.role}
                    </Badge>
                  )}
                  {canManageMembers && !isOwner && !isCurrentUser && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-red-500"
                      onClick={() => handleRemove(member.id)}
                      data-testid={`button-remove-${member.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {invites.filter((i: any) => !i.acceptedAt).length > 0 && (
        <Card className="bg-card border-border rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Pending Invites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invites.filter((i: any) => !i.acceptedAt).map((invite: any) => (
              <div 
                key={invite.id} 
                className="flex items-center justify-between p-3 rounded-xl bg-violet-50 border border-violet-100"
                data-testid={`invite-${invite.id}`}
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-violet-500" />
                  <div>
                    <p className="font-medium text-foreground">{invite.email}</p>
                    <p className="text-sm text-muted-foreground">Invited as {invite.role}</p>
                  </div>
                </div>
                <Badge variant="outline" className="rounded-full bg-violet-50 text-violet-700 border-violet-200">
                  Pending
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted border-border rounded-xl">
        <CardContent className="py-4">
          <h3 className="font-medium text-foreground mb-2">Role Permissions</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Owner:</strong> Full control, delete workspace</p>
            <p><strong>Admin:</strong> Manage members, edit all content</p>
            <p><strong>Member:</strong> Create and edit own content</p>
            <p><strong>Viewer:</strong> Read-only access</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
