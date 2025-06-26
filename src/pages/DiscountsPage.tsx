// src/pages/DiscountsPage.tsx

import React, { useState, useMemo } from 'react';
import {
  Typography,
  Box,
  Container,
  Button,
  useTheme,
  useMediaQuery,
  Fab,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PercentIcon from '@mui/icons-material/Percent';
import DiscountTable from '../components/DiscountTable';
import DiscountForm from '../components/DiscountForm';
import ProtectedComponent from '../components/ProtectedComponent';
import { useRoleControl } from '../hooks/useRoleControl';
import { DiscountRecord, DiscountStats } from '../types/discount';

const DiscountsPage = () => {
  const [openForm, setOpenForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editData, setEditData] = useState<DiscountRecord | undefined>(undefined);
  const [discountList, setDiscountList] = useState<DiscountRecord[]>([]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAdmin } = useRoleControl();

  // Calculate real stats from data
  const stats = useMemo(() => {
    if (discountList.length === 0) {
      return {
        totalDiscounts: 0,
        activeDiscounts: 0,
        expiredDiscounts: 0,
        usedUpDiscounts: 0,
        totalUsages: 0,
        percentageDiscounts: 0,
        fixedAmountDiscounts: 0,
      };
    }

    const calculatedStats = {
      totalDiscounts: discountList.length,
      activeDiscounts: 0,
      expiredDiscounts: 0,
      usedUpDiscounts: 0,
      totalUsages: 0,
      percentageDiscounts: 0,
      fixedAmountDiscounts: 0,
    };

    discountList.forEach(discount => {
      // Count by status
      switch (discount.status) {
        case 'Active':
          if (discount.isActive) calculatedStats.activeDiscounts++;
          break;
        case 'Expired':
          calculatedStats.expiredDiscounts++;
          break;
        case 'Used Up':
          calculatedStats.usedUpDiscounts++;
          break;
      }

      // Count total usages
      calculatedStats.totalUsages += discount.currentUses;

      // Count by type
      if (discount.type === 'percentage') {
        calculatedStats.percentageDiscounts++;
      } else {
        calculatedStats.fixedAmountDiscounts++;
      }
    });

    return calculatedStats;
  }, [discountList]);

  // Handle data loaded from DiscountTable
  const handleDataLoaded = ({ discountList }: { discountList: DiscountRecord[] }) => {
    setDiscountList(discountList);
  };

  const handleFormClose = () => {
    setOpenForm(false);
    setEditData(undefined);
    // Trigger a refresh by changing the key prop
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEdit = (discountData: DiscountRecord) => {
    setEditData(discountData);
    setOpenForm(true);
  };

  const handleAddNew = () => {
    setEditData(undefined);
    setOpenForm(true);
  };

  return (
    <>
      <Container
        maxWidth="xl"
        sx={{
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 2, sm: 3 }
        }}
      >
        {/* Header Section */}
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: { xs: 2, sm: 3 },
          gap: { xs: 2, sm: 0 }
        }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
                color: 'text.primary',
                mb: 0.5
              }}
            >
              Discount Codes
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {isAdmin ? 'Create and manage discount codes for classes, workshops, and packages' : 'View available discount codes and their usage'}
            </Typography>
          </Box>

          {/* Desktop Add Button - Sadece admin için */}
          <ProtectedComponent allowedRoles={['admin']}>
            {!isMobile && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddNew}
                size="large"
                sx={{
                  px: 3,
                  py: 1.5,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: 3,
                  '&:hover': {
                    boxShadow: 6,
                  },
                }}
              >
                Create Discount
              </Button>
            )}
          </ProtectedComponent>
        </Box>

        {/* Stats Cards - Sadece admin için */}
        <ProtectedComponent allowedRoles={['admin']}>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)'
            },
            gap: 2,
            mb: 3
          }}>
            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <LocalOfferIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              </Box>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {stats.totalDiscounts}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Discount Codes
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <LocalOfferIcon sx={{ fontSize: 32, color: 'success.main' }} />
              </Box>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {stats.activeDiscounts}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Discounts
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <TrendingUpIcon sx={{ fontSize: 32, color: 'secondary.main' }} />
              </Box>
              <Typography variant="h4" color="secondary.main" fontWeight="bold">
                {stats.totalUsages}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Uses
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <PercentIcon sx={{ fontSize: 32, color: 'warning.main' }} />
              </Box>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {stats.percentageDiscounts}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Percentage Discounts
              </Typography>
            </Paper>
          </Box>

          {/* Secondary Stats */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)'
            },
            gap: 2,
            mb: 3
          }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <AttachMoneyIcon sx={{ fontSize: 24, color: 'info.main' }} />
              </Box>
              <Typography variant="h6" color="info.main" fontWeight="bold">
                {stats.fixedAmountDiscounts}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Fixed Amount
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" color="warning.main" fontWeight="bold">
                {stats.expiredDiscounts}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Expired
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6" color="error.main" fontWeight="bold">
                {stats.usedUpDiscounts}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Used Up
              </Typography>
            </Paper>
          </Box>
        </ProtectedComponent>

        {/* Quick Tips for Non-Admin Users */}
        <ProtectedComponent 
          allowedRoles={['trainer', 'staff']}
        >
          <Paper sx={{ p: 3, mb: 3, bgcolor: 'info.lighter' }}>
            <Typography variant="h6" color="info.main" gutterBottom>
              Using Discount Codes
            </Typography>
            <Typography variant="body2" color="info.main">
              • Discount codes can be applied during class/workshop booking
              <br />• Check the status and validity dates before accepting codes
              <br />• Some codes have usage limits or minimum purchase requirements
              <br />• Contact admin if you need to create new discount codes
            </Typography>
          </Paper>
        </ProtectedComponent>

        {/* Discounts Table/Cards */}
        <Box sx={{
          width: '100%',
          overflow: 'hidden'
        }}>
          <DiscountTable
            key={refreshTrigger}
            refreshTrigger={refreshTrigger}
            onEdit={handleEdit}
            onDataLoaded={handleDataLoaded}
          />
        </Box>
      </Container>

      {/* Mobile Floating Action Button - Sadece admin için */}
      <ProtectedComponent allowedRoles={['admin']}>
        {isMobile && (
          <Fab
            color="primary"
            aria-label="create discount"
            onClick={handleAddNew}
            sx={{
              position: 'fixed',
              bottom: { xs: 24, sm: 32 },
              right: { xs: 24, sm: 32 },
              zIndex: theme.zIndex.speedDial,
              boxShadow: 6,
              '&:hover': {
                boxShadow: 12,
              },
            }}
          >
            <AddIcon />
          </Fab>
        )}
      </ProtectedComponent>

      {/* Discount Form Modal - Sadece admin için */}
      <ProtectedComponent allowedRoles={['admin']}>
        <DiscountForm
          open={openForm}
          onClose={handleFormClose}
          editData={editData}
        />
      </ProtectedComponent>
    </>
  );
};

export default DiscountsPage;