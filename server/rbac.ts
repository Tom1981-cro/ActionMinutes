import type { Request, Response, NextFunction, RequestHandler } from "express";
import { storage } from "./storage";
import type { WorkspaceRole } from "@shared/schema";

export type Permission = 
  | 'workspace:read'
  | 'workspace:write'
  | 'workspace:admin'
  | 'workspace:delete'
  | 'members:read'
  | 'members:invite'
  | 'members:manage'
  | 'members:remove'
  | 'meetings:read'
  | 'meetings:write'
  | 'meetings:delete'
  | 'actions:read'
  | 'actions:write'
  | 'actions:assign'
  | 'drafts:read'
  | 'drafts:write';

const rolePermissions: Record<WorkspaceRole, Permission[]> = {
  owner: [
    'workspace:read', 'workspace:write', 'workspace:admin', 'workspace:delete',
    'members:read', 'members:invite', 'members:manage', 'members:remove',
    'meetings:read', 'meetings:write', 'meetings:delete',
    'actions:read', 'actions:write', 'actions:assign',
    'drafts:read', 'drafts:write',
  ],
  admin: [
    'workspace:read', 'workspace:write', 'workspace:admin',
    'members:read', 'members:invite', 'members:manage',
    'meetings:read', 'meetings:write', 'meetings:delete',
    'actions:read', 'actions:write', 'actions:assign',
    'drafts:read', 'drafts:write',
  ],
  member: [
    'workspace:read',
    'members:read',
    'meetings:read', 'meetings:write',
    'actions:read', 'actions:write', 'actions:assign',
    'drafts:read', 'drafts:write',
  ],
  viewer: [
    'workspace:read',
    'members:read',
    'meetings:read',
    'actions:read',
    'drafts:read',
  ],
};

export function hasPermission(role: WorkspaceRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: WorkspaceRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

export function hasAllPermissions(role: WorkspaceRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

export interface RBACRequest extends Request {
  workspaceRole?: WorkspaceRole;
  workspaceMembership?: { id: string; workspaceId: string; userId: string; role: WorkspaceRole };
}

export function requireWorkspaceAccess(...requiredPermissions: Permission[]): RequestHandler {
  return async (req: RBACRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.query.userId as string || req.body?.userId;
      const workspaceId = req.params.workspaceId || req.query.workspaceId as string || req.body?.workspaceId;

      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      if (!workspaceId) {
        return res.status(400).json({ error: "Workspace ID required" });
      }

      const membership = await storage.getWorkspaceMember(workspaceId, userId);
      
      if (!membership) {
        return res.status(403).json({ error: "Not a member of this workspace" });
      }

      const role = membership.role as WorkspaceRole;
      
      if (requiredPermissions.length > 0 && !hasAllPermissions(role, requiredPermissions)) {
        return res.status(403).json({ 
          error: "Insufficient permissions",
          required: requiredPermissions,
          current: role
        });
      }

      req.workspaceRole = role;
      req.workspaceMembership = {
        id: membership.id,
        workspaceId: membership.workspaceId,
        userId: membership.userId,
        role
      };

      next();
    } catch (error) {
      console.error('[RBAC] Error checking workspace access:', error);
      res.status(500).json({ error: "Failed to verify workspace access" });
    }
  };
}

export function requireWorkspaceMembership(): RequestHandler {
  return requireWorkspaceAccess();
}

export function requireWorkspaceAdmin(): RequestHandler {
  return requireWorkspaceAccess('workspace:admin');
}

export function requireWorkspaceOwner(): RequestHandler {
  return requireWorkspaceAccess('workspace:delete');
}

export async function checkWorkspaceAccess(
  userId: string, 
  workspaceId: string, 
  permission?: Permission
): Promise<{ allowed: boolean; role?: WorkspaceRole; error?: string }> {
  try {
    const membership = await storage.getWorkspaceMember(workspaceId, userId);
    
    if (!membership) {
      return { allowed: false, error: "Not a member of this workspace" };
    }

    const role = membership.role as WorkspaceRole;

    if (permission && !hasPermission(role, permission)) {
      return { allowed: false, role, error: "Insufficient permissions" };
    }

    return { allowed: true, role };
  } catch (error) {
    return { allowed: false, error: "Failed to verify access" };
  }
}

export async function checkMeetingAccess(
  userId: string,
  meetingUserId: string,
  meetingWorkspaceId: string | null,
  permission: 'read' | 'write' | 'delete' = 'read'
): Promise<{ allowed: boolean; error?: string }> {
  if (meetingUserId === userId) {
    return { allowed: true };
  }

  if (!meetingWorkspaceId) {
    return { allowed: false, error: "This is a personal meeting" };
  }

  const permissionMap: Record<string, Permission> = {
    read: 'meetings:read',
    write: 'meetings:write',
    delete: 'meetings:delete',
  };

  return checkWorkspaceAccess(userId, meetingWorkspaceId, permissionMap[permission]);
}

export function canManageRole(actorRole: WorkspaceRole, targetRole: WorkspaceRole): boolean {
  const roleHierarchy: Record<WorkspaceRole, number> = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1,
  };

  return roleHierarchy[actorRole] > roleHierarchy[targetRole];
}

export function canAssignRole(actorRole: WorkspaceRole, newRole: WorkspaceRole): boolean {
  if (newRole === 'owner') return false;
  
  const roleHierarchy: Record<WorkspaceRole, number> = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1,
  };

  return roleHierarchy[actorRole] > roleHierarchy[newRole];
}
