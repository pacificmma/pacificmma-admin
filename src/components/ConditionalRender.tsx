// src/components/ConditionalRender.tsx
import React from 'react';
import { usePermissions } from '../hooks/usePermisions';
import { UserRole } from '../hooks/useRoleControl';

interface ConditionalRenderProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: keyof ReturnType<typeof usePermissions>;
  fallback?: React.ReactNode;
}

const ConditionalRender: React.FC<ConditionalRenderProps> = ({ 
  children, 
  allowedRoles,
  requiredPermission,
  fallback = null 
}) => {
  const permissions = usePermissions();

  // Check role-based access
  if (allowedRoles) {
    const hasAccess = permissions.canAccess(allowedRoles);
    return hasAccess ? <>{children}</> : <>{fallback}</>;
  }

  // Check specific permission
  if (requiredPermission) {
    const hasPermission = permissions[requiredPermission];
    return hasPermission ? <>{children}</> : <>{fallback}</>;
  }

  // Default: render children
  return <>{children}</>;
};

export default ConditionalRender;