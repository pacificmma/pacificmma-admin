// src/components/ProtectedComponent.tsx
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { useRoleControl, UserRole } from '../hooks/useRoleControl';

interface ProtectedComponentProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackMessage?: string;
}

const ProtectedComponent: React.FC<ProtectedComponentProps> = ({ 
  children, 
  allowedRoles, 
  fallbackMessage = "You don't have permission to access this feature." 
}) => {
  const { userData, loading } = useRoleControl();

  if (loading) {
    return null;
  }

  if (!userData || !allowedRoles.includes(userData.role)) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'warning.lighter' }}>
        <Typography variant="body1" color="warning.dark">
          {fallbackMessage}
        </Typography>
      </Paper>
    );
  }

  return <>{children}</>;
};

export default ProtectedComponent;