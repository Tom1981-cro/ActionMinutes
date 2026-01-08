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
        <Button variant="ghost" className="flex items-center gap-2 text-left h-auto py-2 px-3 rounded-xl hover:bg-gray-100" data-testid="button-workspace-switcher">
          <div className="flex items-center gap-2">
            {currentWorkspaceId ? (
              <Users className="h-4 w-4 text-indigo-500" />
            ) : (
              <User className="h-4 w-4 text-slate-500" />
            )}
            <span className="text-sm font-medium text-slate-700">
              {currentWorkspace?.name || (user.enablePersonal ? (
                <span className="text-gradient font-black shadow-glow-violet-sm px-1 rounded">Personal</span>
              ) : "Select workspace")}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-slate-800">Switch Workspace</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {user.enablePersonal && (
            <button
              onClick={() => handleSelect(null)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                !currentWorkspaceId ? 'bg-indigo-50 border-2 border-indigo-200' : 'hover:bg-gray-50 border-2 border-transparent'
              }`}
              data-testid="button-workspace-personal"
            >
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-slate-500" />
                <div className="text-left">
                  <p className="font-medium text-slate-700">
                    <span className="text-gradient font-black shadow-glow-violet-sm px-1 rounded">Personal</span>
                  </p>
                  <p className="text-xs text-gray-500">Your private meetings</p>
                </div>
              </div>
              {!currentWorkspaceId && <Check className="h-5 w-5 text-indigo-500" />}
            </button>
          )}

          {workspaces.map((workspace: any) => (
            <button
              key={workspace.id}
              onClick={() => handleSelect(workspace.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                currentWorkspaceId === workspace.id ? 'bg-indigo-50 border-2 border-indigo-200' : 'hover:bg-gray-50 border-2 border-transparent'
              }`}
              data-testid={`button-workspace-${workspace.id}`}
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-indigo-500" />
                <div className="text-left">
                  <p className="font-medium text-slate-700">
                    <span className="text-gradient font-black shadow-glow-violet-sm px-1 rounded">Workspace</span>: {workspace.name}
                  </p>
                  <p className="text-xs text-gray-500">Team workspace</p>
                </div>
              </div>
              {currentWorkspaceId === workspace.id && <Check className="h-5 w-5 text-indigo-500" />}
            </button>
          ))}

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border-2 border-dashed border-gray-200 text-gray-500" data-testid="button-create-workspace">
                <Plus className="h-5 w-5" />
                <span className="font-medium">Create workspace</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-slate-800">Create Workspace</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">Workspace Name</Label>
                  <Input
                    placeholder="e.g., Engineering Team"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="rounded-xl border-gray-200"
                    data-testid="input-workspace-name"
                  />
                </div>
                <Button 
                  onClick={handleCreate} 
                  disabled={!newName.trim() || createWorkspace.isPending}
                  className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-600"
                  data-testid="button-confirm-create-workspace"
                >
                  {createWorkspace.isPending ? "Creating..." : "Create Workspace"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
