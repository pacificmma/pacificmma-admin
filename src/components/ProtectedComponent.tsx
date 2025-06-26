// src/components/ProtectedComponent.tsx
import React from 'react';
import { useRoleControl, UserRole } from '../hooks/useRoleControl';

interface ProtectedComponentProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredRole?: UserRole; // Tek role için kolaylık
  fallbackComponent?: React.ReactNode;
  showFallback?: boolean;
}

const ProtectedComponent: React.FC<ProtectedComponentProps> = ({ 
  children, 
  allowedRoles, 
  requiredRole,
  fallbackComponent = null,
  showFallback = false
}) => {
  const { userData, loading } = useRoleControl();

  if (loading) {
    return null;
  }

  // allowedRoles veya requiredRole'den birini kullan
  const rolesToCheck = allowedRoles || (requiredRole ? [requiredRole] : []);

  // Eğer izin yoksa hiçbir şey gösterme (varsayılan davranış)
  if (!userData || !rolesToCheck.includes(userData.role)) {
    return showFallback ? <>{fallbackComponent}</> : null;
  }

  return <>{children}</>;
};

export default ProtectedComponent;