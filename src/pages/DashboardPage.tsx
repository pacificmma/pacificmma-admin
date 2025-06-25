// src/pages/DashboardPage.tsx
import React from 'react';
import {
  Typography,
  Box,
  Container,
  Paper,
} from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import GroupIcon from '@mui/icons-material/Group';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ProtectedComponent from '../components/ProtectedComponent';
import { useRoleControl } from '../hooks/useRoleControl';

const DashboardPage = () => {
  const { userData } = useRoleControl();

  return (
    <ProtectedComponent 
      allowedRoles={['admin']} 
    >
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
              color: 'text.primary',
              mb: 0.5
            }}
          >
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back, {userData?.fullName}! Here's your gym overview.
          </Typography>
        </Box>

        {/* Stats Grid */}
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { 
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)'
          },
          gap: 3,
          mb: 4
        }}>
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <FitnessCenterIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            </Box>
            <Typography variant="h4" color="primary" fontWeight="bold">
              32
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Classes
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <GroupIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
            </Box>
            <Typography variant="h4" color="secondary" fontWeight="bold">
              245
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Members
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <AttachMoneyIcon sx={{ fontSize: 40, color: 'success.main' }} />
            </Box>
            <Typography variant="h4" color="success.main" fontWeight="bold">
              $12.5K
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Monthly Revenue
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: 'warning.main' }} />
            </Box>
            <Typography variant="h4" color="warning.main" fontWeight="bold">
              +15%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Growth Rate
            </Typography>
          </Paper>
        </Box>

        {/* Quick Actions */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the navigation menu to:
            <br />• Manage classes and workshops
            <br />• Add new staff members  
            <br />• Create discount codes
            <br />• Monitor member activity
          </Typography>
        </Paper>
      </Container>
    </ProtectedComponent>
  );
};

export default DashboardPage;