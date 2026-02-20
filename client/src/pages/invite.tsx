import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useStore } from "@/lib/store";

interface InviteDetails {
  workspaceName: string;
  role: string;
  email: string;
  expiresAt: string;
  isExpired: boolean;
  isAccepted: boolean;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const setCurrentWorkspace = useStore((state) => state.setCurrentWorkspace);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const { data: invite, isLoading, error } = useQuery<InviteDetails>({
    queryKey: ["/api/invites", token],
    queryFn: async () => {
      const res = await fetch(`/api/invites/${token}`);
      if (!res.ok) throw new Error("Invite not found");
      return res.json();
    },
    enabled: !!token,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to accept invite");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      setCurrentWorkspace(data.workspaceId);
      setLocation("/inbox");
    },
    onError: (error: Error) => {
      setAcceptError(error.message);
    },
  });

  useEffect(() => {
    if (!authLoading && !user && token) {
      const returnUrl = encodeURIComponent(`/invite/${token}`);
      setLocation(`/?return=${returnUrl}`);
    }
  }, [authLoading, user, token, setLocation]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>Invite Not Found</CardTitle>
            <CardDescription>
              This invite link is invalid or has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation("/")} data-testid="button-go-home">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-violet-600" />
            </div>
            <CardTitle>Invite Expired</CardTitle>
            <CardDescription>
              This invite to <span className="font-medium">{invite.workspaceName}</span> has expired.
              Please ask the workspace admin to send a new invite.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation("/inbox")} data-testid="button-go-inbox">
              Go to Inbox
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.isAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Already Accepted</CardTitle>
            <CardDescription>
              This invite to <span className="font-medium">{invite.workspaceName}</span> has already been accepted.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation("/inbox")} data-testid="button-go-inbox">
              Go to Inbox
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-accent flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Join Workspace</CardTitle>
          <CardDescription>
            You've been invited to join <span className="font-medium">{invite.workspaceName}</span> as a <span className="font-medium">{invite.role}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {acceptError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {acceptError}
            </div>
          )}
          
          <div className="text-center text-sm text-muted-foreground">
            Logged in as <span className="font-medium">{user?.email || user?.name}</span>
          </div>

          <Button
            className="w-full bg-primary hover:bg-primary/90"
            onClick={() => acceptMutation.mutate()}
            disabled={acceptMutation.isPending}
            data-testid="button-accept-invite"
          >
            {acceptMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              "Accept Invite"
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setLocation("/inbox")}
            data-testid="button-decline"
          >
            Decline
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
