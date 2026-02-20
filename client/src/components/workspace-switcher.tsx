import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Plus, Users, User, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { useWorkspaces, useCreateWorkspace } from "@/lib/hooks";

export function WorkspaceSwitcher() {
  const { currentWorkspaceId, setCurrentWorkspace, user } = useStore();
  const { data: workspaces = [] } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const currentWorkspace = workspaces.find((w: any) => w.id === currentWorkspaceId);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createWorkspace.mutateAsync(newName);
    setNewName("");
    setCreateOpen(false);
  };

  const handleSelect = (workspaceId: string | null) => {
    setCurrentWorkspace(workspaceId);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 text-left h-auto py-2 px-3 rounded-xl hover:bg-accent hover:border-border border border-transparent transition-all" data-testid="button-workspace-switcher">
          <div className="flex items-center gap-2">
            {currentWorkspaceId ? (
              <Users className="h-4 w-4 text-primary" />
            ) : (
              <User className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-foreground">
              {currentWorkspace ? (
                <span className="text-primary font-black px-1 rounded">
                  {currentWorkspace.name}
                </span>
              ) : (user.enablePersonal ? (
                <span className="text-primary font-black px-1 rounded">Personal</span>
              ) : "Select workspace")}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            Switch <span className="text-primary font-black px-1 rounded">Workspace</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {user.enablePersonal && (
            <button
              onClick={() => handleSelect(null)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                !currentWorkspaceId ? 'bg-accent border-2 border-primary' : 'hover:bg-accent border-2 border-transparent'
              }`}
              data-testid="button-workspace-personal"
            >
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium text-foreground">
                    <span className="text-primary font-black px-1 rounded">Personal</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Your private meetings</p>
                </div>
              </div>
              {!currentWorkspaceId && <Check className="h-5 w-5 text-primary" />}
            </button>
          )}

          {workspaces.map((workspace: any) => (
            <button
              key={workspace.id}
              onClick={() => handleSelect(workspace.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                currentWorkspaceId === workspace.id ? 'bg-accent border-2 border-primary' : 'hover:bg-accent border-2 border-transparent'
              }`}
              data-testid={`button-workspace-${workspace.id}`}
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-foreground">
                    <span className="text-primary font-black px-1 rounded">{workspace.name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Team workspace</p>
                </div>
              </div>
              {currentWorkspaceId === workspace.id && <Check className="h-5 w-5 text-primary" />}
            </button>
          ))}

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent border-2 border-dashed border-border text-muted-foreground" data-testid="button-create-workspace">
                <Plus className="h-5 w-5" />
                <span className="font-medium">Create <span className="text-primary font-black px-1 rounded">Workspace</span></span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Create <span className="text-primary font-black px-1 rounded">Workspace</span>
              </DialogTitle>
            </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-foreground">
                    <span className="text-primary font-black px-1 rounded">Workspace</span> Name
                  </Label>
                  <Input
                    placeholder="e.g., Engineering Team"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="rounded-xl border-border"
                    data-testid="input-workspace-name"
                  />
                </div>
                <Button 
                  onClick={handleCreate} 
                  disabled={!newName.trim() || createWorkspace.isPending}
                  className="w-full rounded-xl bg-primary hover:bg-primary/90"
                  data-testid="button-confirm-create-workspace"
                >
                  {createWorkspace.isPending ? "Creating..." : (
                    <span>Create <span className="font-black">Workspace</span></span>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
