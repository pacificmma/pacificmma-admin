// src/hooks/usePermissions.ts
import { useRoleControl, UserRole } from './useRoleControl';

interface UsePermissionsReturn {
  canAccess: (allowedRoles: UserRole[]) => boolean;
  canCreateClasses: boolean;
  canEditClasses: boolean;
  canDeleteClasses: boolean;
  canManageStaff: boolean;
  canCreateDiscounts: boolean;
  canViewMembers: boolean;
  canViewMySchedule: boolean;
  canViewDashboard: boolean;
}

export const usePermissions = (): UsePermissionsReturn => {
  const { userData, isAdmin, isTrainer, isStaff } = useRoleControl();

  const canAccess = (allowedRoles: UserRole[]): boolean => {
    if (!userData) return false;
    return allowedRoles.includes(userData.role);
  };

  return {
    canAccess,
    
    // Class permissions
    canCreateClasses: isAdmin,
    canEditClasses: isAdmin,
    canDeleteClasses: isAdmin,
    
    // Staff permissions
    canManageStaff: isAdmin,
    
    // Discount permissions
    canCreateDiscounts: isAdmin,
    
    // Member permissions
    canViewMembers: isAdmin,
    
    // Schedule permissions
    canViewMySchedule: isTrainer || isStaff || isAdmin,
    
    // Dashboard permissions
    canViewDashboard: isAdmin || isTrainer || isStaff,
  };
};