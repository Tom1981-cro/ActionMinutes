import { describe, it, expect } from 'vitest';
import { hasPermission, hasAnyPermission, hasAllPermissions, type Permission } from './rbac';
import type { WorkspaceRole } from '../shared/schema';

describe('RBAC Permission System', () => {
  describe('hasPermission', () => {
    it('owner has all permissions', () => {
      const allPermissions: Permission[] = [
        'workspace:read', 'workspace:write', 'workspace:admin', 'workspace:delete',
        'members:read', 'members:invite', 'members:manage', 'members:remove',
        'meetings:read', 'meetings:write', 'meetings:delete',
        'actions:read', 'actions:write', 'actions:assign',
        'drafts:read', 'drafts:write',
      ];
      
      allPermissions.forEach(permission => {
        expect(hasPermission('owner', permission)).toBe(true);
      });
    });

    it('admin cannot delete workspace or remove members', () => {
      expect(hasPermission('admin', 'workspace:delete')).toBe(false);
      expect(hasPermission('admin', 'members:remove')).toBe(false);
    });

    it('admin has most permissions', () => {
      expect(hasPermission('admin', 'workspace:read')).toBe(true);
      expect(hasPermission('admin', 'workspace:write')).toBe(true);
      expect(hasPermission('admin', 'workspace:admin')).toBe(true);
      expect(hasPermission('admin', 'members:invite')).toBe(true);
      expect(hasPermission('admin', 'members:manage')).toBe(true);
      expect(hasPermission('admin', 'meetings:write')).toBe(true);
      expect(hasPermission('admin', 'meetings:delete')).toBe(true);
    });

    it('member can read and write meetings but not delete', () => {
      expect(hasPermission('member', 'meetings:read')).toBe(true);
      expect(hasPermission('member', 'meetings:write')).toBe(true);
      expect(hasPermission('member', 'meetings:delete')).toBe(false);
    });

    it('member cannot manage members or invite', () => {
      expect(hasPermission('member', 'members:invite')).toBe(false);
      expect(hasPermission('member', 'members:manage')).toBe(false);
    });

    it('viewer has read-only access', () => {
      expect(hasPermission('viewer', 'workspace:read')).toBe(true);
      expect(hasPermission('viewer', 'members:read')).toBe(true);
      expect(hasPermission('viewer', 'meetings:read')).toBe(true);
      expect(hasPermission('viewer', 'actions:read')).toBe(true);
      expect(hasPermission('viewer', 'drafts:read')).toBe(true);
    });

    it('viewer cannot write or modify anything', () => {
      expect(hasPermission('viewer', 'workspace:write')).toBe(false);
      expect(hasPermission('viewer', 'meetings:write')).toBe(false);
      expect(hasPermission('viewer', 'actions:write')).toBe(false);
      expect(hasPermission('viewer', 'drafts:write')).toBe(false);
      expect(hasPermission('viewer', 'members:invite')).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true if role has at least one permission', () => {
      expect(hasAnyPermission('viewer', ['workspace:read', 'workspace:write'])).toBe(true);
    });

    it('returns false if role has none of the permissions', () => {
      expect(hasAnyPermission('viewer', ['workspace:write', 'workspace:admin'])).toBe(false);
    });

    it('returns true for owner on any permission set', () => {
      expect(hasAnyPermission('owner', ['workspace:delete', 'members:remove'])).toBe(true);
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true if role has all permissions', () => {
      expect(hasAllPermissions('owner', ['workspace:read', 'workspace:delete'])).toBe(true);
    });

    it('returns false if role is missing any permission', () => {
      expect(hasAllPermissions('admin', ['workspace:admin', 'workspace:delete'])).toBe(false);
    });

    it('returns true for empty permission list', () => {
      expect(hasAllPermissions('viewer', [])).toBe(true);
    });

    it('member can read and write actions', () => {
      expect(hasAllPermissions('member', ['actions:read', 'actions:write'])).toBe(true);
    });
  });

  describe('Role hierarchy', () => {
    const roles: WorkspaceRole[] = ['owner', 'admin', 'member', 'viewer'];
    
    it('owner has more permissions than admin', () => {
      expect(hasPermission('owner', 'workspace:delete')).toBe(true);
      expect(hasPermission('admin', 'workspace:delete')).toBe(false);
    });

    it('admin has more permissions than member', () => {
      expect(hasPermission('admin', 'members:invite')).toBe(true);
      expect(hasPermission('member', 'members:invite')).toBe(false);
    });

    it('member has more permissions than viewer', () => {
      expect(hasPermission('member', 'meetings:write')).toBe(true);
      expect(hasPermission('viewer', 'meetings:write')).toBe(false);
    });

    it('all roles can read workspace', () => {
      roles.forEach(role => {
        expect(hasPermission(role, 'workspace:read')).toBe(true);
      });
    });

    it('all roles can read members', () => {
      roles.forEach(role => {
        expect(hasPermission(role, 'members:read')).toBe(true);
      });
    });
  });

  describe('Action permissions', () => {
    it('member can assign actions to others', () => {
      expect(hasPermission('member', 'actions:assign')).toBe(true);
    });

    it('viewer cannot assign actions', () => {
      expect(hasPermission('viewer', 'actions:assign')).toBe(false);
    });
  });

  describe('Draft permissions', () => {
    it('member can read and write drafts', () => {
      expect(hasPermission('member', 'drafts:read')).toBe(true);
      expect(hasPermission('member', 'drafts:write')).toBe(true);
    });

    it('viewer can only read drafts', () => {
      expect(hasPermission('viewer', 'drafts:read')).toBe(true);
      expect(hasPermission('viewer', 'drafts:write')).toBe(false);
    });
  });
});
