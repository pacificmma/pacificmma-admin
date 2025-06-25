// src/components/ProtectedComponent.tsx
import React from 'react';
import { useRoleControl, UserRole } from '../hooks/useRoleControl';

interface ProtectedComponentProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackComponent?: React.ReactNode;
  showFallback?: boolean;
}

const ProtectedComponent: React.FC<ProtectedComponentProps> = ({ 
  children, 
  allowedRoles, 
  fallbackComponent = null,
  showFallback = false
}) => {
  const { userData, loading } = useRoleControl();

  if (loading) {
    return null;
  }

  // Eğer izin yoksa hiçbir şey gösterme (varsayılan davranış)
  if (!userData || !allowedRoles.includes(userData.role)) {
    return showFallback ? <>{fallbackComponent}</> : null;
  }

  return <>{children}</>;
};

export default ProtectedComponent;