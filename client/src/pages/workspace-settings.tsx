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
  owner: "bg-amber-50 text-amber-700 border-amber-200",
  admin: "bg-purple-50 text-purple-700 border-purple-200",
  member: "bg-teal-50 text-teal-700 border-teal-200",
  viewer: "bg-stone-50 text-stone-600 border-stone-200",
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
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-800">{workspace?.name}</h2>
        <p className="text-stone-500">Manage workspace members and permissions.</p>
      </div>

      <Card className="bg-white border-stone-200 rounded-3xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg text-slate-800">Members</CardTitle>
            <CardDescription className="text-stone-500">{members.length} members</CardDescription>
          </div>
          {canManageMembers && (
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full bg-teal-500 hover:bg-teal-600" data-testid="button-invite-member">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-slate-800">Invite Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700">Email</Label>
                    <Input
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="rounded-2xl border-stone-200"
                      data-testid="input-invite-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">Role</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger className="rounded-2xl border-stone-200" data-testid="select-invite-role">
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
                    className="w-full rounded-2xl bg-teal-500 hover:bg-teal-600"
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
                className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100"
                data-testid={`member-${member.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-medium">
                    {member.user?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">
                      {member.user?.name || member.user?.email}
                      {isCurrentUser && <span className="text-stone-500 text-sm ml-2">(you)</span>}
                    </p>
                    <p className="text-sm text-stone-500">{member.user?.email}</p>
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
                      className="text-stone-400 hover:text-red-500"
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
        <Card className="bg-white border-stone-200 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">Pending Invites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invites.filter((i: any) => !i.acceptedAt).map((invite: any) => (
              <div 
                key={invite.id} 
                className="flex items-center justify-between p-3 rounded-2xl bg-amber-50 border border-amber-100"
                data-testid={`invite-${invite.id}`}
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-slate-800">{invite.email}</p>
                    <p className="text-sm text-stone-500">Invited as {invite.role}</p>
                  </div>
                </div>
                <Badge variant="outline" className="rounded-full bg-amber-50 text-amber-700 border-amber-200">
                  Pending
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="bg-stone-50 border-stone-200 rounded-3xl">
        <CardContent className="py-4">
          <h3 className="font-medium text-slate-800 mb-2">Role Permissions</h3>
          <div className="text-sm text-stone-600 space-y-1">
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
