// src/pages/MembershipPackagesPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Box,
  Container,
  Button,
  useTheme,
  useMediaQuery,
  Fab,
  Paper,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Menu,
  MenuItem as MenuItemComponent,
  Divider,
  Avatar,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import GroupIcon from '@mui/icons-material/Group';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import StarIcon from '@mui/icons-material/Star';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';

import MembershipPackageForm from '../components/MembershipPackageForm';
import ProtectedComponent from '../components/ProtectedComponent';
import { useRoleControl } from '../hooks/useRoleControl';

import {
  MembershipPackageRecord,
  PackageUsageStats,
} from '../types/membershipPackages';
import {
  getAllMembershipPackages,
  updateMembershipPackage,
  deleteMembershipPackage,
  getPackageUsageStats,
  SPORT_CATEGORIES,
} from '../services/membershipPackageService';

const MembershipPackagesPage = () => {
  const [packages, setPackages] = useState<MembershipPackageRecord[]>([]);
  const [packageStats, setPackageStats] = useState<Record<string, PackageUsageStats>>({});
  const [openForm, setOpenForm] = useState(false);
  const [editData, setEditData] = useState<MembershipPackageRecord | undefined>(undefined);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Menu and dialog states
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPackage, setSelectedPackage] = useState<MembershipPackageRecord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<MembershipPackageRecord | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAdmin } = useRoleControl();

  useEffect(() => {
    loadPackages();
  }, [refreshTrigger]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const packagesData = await getAllMembershipPackages();
      setPackages(packagesData);
      
      // Load stats for each package
      const stats: Record<string, PackageUsageStats> = {};
      await Promise.all(
        packagesData.map(async (pkg) => {
          try {
            const packageStats = await getPackageUsageStats(pkg.id);
            stats[pkg.id] = packageStats;
          } catch (error) {
            console.warn(`Failed to load stats for package ${pkg.id}:`, error);
          }
        })
      );
      setPackageStats(stats);
      
    } catch (err: any) {
      console.error('Error loading packages:', err);
      setError(err.message || 'Failed to load membership packages');
    } finally {
      setLoading(false);
    }
  };

  // Calculate overview stats
  const overviewStats = useMemo(() => {
    const stats = {
      totalPackages: packages.length,
      activePackages: packages.filter(p => p.status === 'Active').length,
      totalRevenue: 0,
      totalSubscriptions: 0,
    };

    Object.values(packageStats).forEach(stat => {
      stats.totalRevenue += stat.totalRevenue;
      stats.totalSubscriptions += stat.totalSubscriptions;
    });

    return stats;
  }, [packages, packageStats]);

  const handleFormClose = () => {
    setOpenForm(false);
    setEditData(undefined);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEdit = (packageData: MembershipPackageRecord) => {
    setEditData(packageData);
    setOpenForm(true);
    handleMenuClose();
  };

  const handleAddNew = () => {
    setEditData(undefined);
    setOpenForm(true);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, pkg: MembershipPackageRecord) => {
    setAnchorEl(event.currentTarget);
    setSelectedPackage(pkg);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPackage(null);
  };

  const handleToggleStatus = async (pkg: MembershipPackageRecord) => {
    try {
      const newStatus = pkg.status === 'Active' ? 'Inactive' : 'Active';
      await updateMembershipPackage(pkg.id, { status: newStatus });
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      setError(`Failed to update package status: ${error.message}`);
    }
    handleMenuClose();
  };

  const handleDeleteClick = (pkg: MembershipPackageRecord) => {
    setPackageToDelete(pkg);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };
  const handleDeleteConfirm = async () => {
    if (!packageToDelete) return;

    try {
      await deleteMembershipPackage(packageToDelete.id);
      setRefreshTrigger(prev => prev + 1);
      setDeleteDialogOpen(false);
      setPackageToDelete(null);
    } catch (error: any) {
      setError(`Failed to delete package: ${error.message}`);
    }
  };

  const getDurationDisplay = (pkg: MembershipPackageRecord) => {
    const unit = pkg.durationType === 'months' ? 'month' : pkg.durationType === 'weeks' ? 'week' : 'day';
    return `${pkg.duration} ${unit}${pkg.duration > 1 ? 's' : ''}`;
  };

  const getPriceDisplay = (pkg: MembershipPackageRecord) => {
    if (pkg.durationType === 'months') {
      return `$${pkg.price}/month`;
    }
    return `$${pkg.price} total`;
  };

  const getSportCategoriesDisplay = (pkg: MembershipPackageRecord) => {
    if (pkg.isFullAccess) {
      return 'Full Access';
    }
    
    const categoryNames = pkg.sportCategories
      .map(catId => SPORT_CATEGORIES.find(cat => cat.id === catId)?.name)
      .filter(Boolean);
    
    if (categoryNames.length <= 2) {
      return categoryNames.join(', ');
    }
    
    return `${categoryNames.slice(0, 2).join(', ')} +${categoryNames.length - 2} more`;
  };

  const renderPackageCard = (pkg: MembershipPackageRecord) => {
    const stats = packageStats[pkg.id];
    
    return (
      <Card
        key={pkg.id}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          border: pkg.isPopular ? 2 : 1,
          borderColor: pkg.isPopular ? 'warning.main' : 'divider',
          '&:hover': {
            boxShadow: theme.shadows[4],
            transform: 'translateY(-2px)',
            transition: 'all 0.2s ease-in-out',
          },
        }}
      >
        {pkg.isPopular && (
          <Box
            sx={{
              position: 'absolute',
              top: -10,
              right: 16,
              backgroundColor: 'warning.main',
              color: 'warning.contrastText',
              px: 2,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.75rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <StarIcon sx={{ fontSize: 14 }} />
            Popular
          </Box>
        )}

        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="h3" fontWeight={600} sx={{ mb: 0.5 }}>
                {pkg.name}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={pkg.status} 
                  size="small" 
                  color={pkg.status === 'Active' ? 'success' : pkg.status === 'Inactive' ? 'warning' : 'default'}
                />
                <Chip 
                  label={getDurationDisplay(pkg)} 
                  size="small" 
                  variant="outlined"
                  icon={<AccessTimeIcon />}
                />
              </Box>
            </Box>
            
            <IconButton 
              size="small" 
              onClick={(e) => handleMenuClick(e, pkg)}
              sx={{ mt: -1 }}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>

          {pkg.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {pkg.description}
            </Typography>
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant="h4" color="primary.main" fontWeight={700}>
              {getPriceDisplay(pkg)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <FitnessCenterIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {getSportCategoriesDisplay(pkg)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {pkg.isUnlimited ? 'Unlimited classes' : 
               `${pkg.classLimitPerWeek ? `${pkg.classLimitPerWeek}/week` : ''}${pkg.classLimitPerWeek && pkg.classLimitPerMonth ? ', ' : ''}${pkg.classLimitPerMonth ? `${pkg.classLimitPerMonth}/month` : ''}`}
            </Typography>
          </Box>

          {/* Package Features */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
            {pkg.allowFreeze && (
              <Chip label="Freeze allowed" size="small" variant="outlined" />
            )}
            {pkg.autoRenewal && (
              <Chip label="Auto-renewal" size="small" variant="outlined" />
            )}
            {pkg.guestPassesIncluded && pkg.guestPassesIncluded > 0 && (
              <Chip label={`${pkg.guestPassesIncluded} guest passes`} size="small" variant="outlined" />
            )}
          </Box>

          {/* Usage Stats */}
          {stats && (
            <Paper sx={{ p: 1.5, bgcolor: 'grey.50', mt: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                Usage Statistics
              </Typography>
              
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary.main" fontWeight={600}>
                      {stats.totalSubscriptions}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Subscriptions
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main" fontWeight={600}>
                      ${stats.totalRevenue.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Revenue
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
              
              {stats.averageRating && (
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                  <Typography variant="caption" color="text.secondary">
                    {stats.averageRating.toFixed(1)} ({stats.totalReviews} reviews)
                  </Typography>
                </Box>
              )}
            </Paper>
          )}
        </CardContent>

        <CardActions sx={{ p: 2, pt: 0 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => handleEdit(pkg)}
            disabled={!isAdmin}
          >
            Edit Package
          </Button>
        </CardActions>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ mt: 2, textAlign: 'center' }}>
          Loading membership packages...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700} sx={{ mb: 1 }}>
            Membership Packages
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your gym's membership packages and pricing
          </Typography>
        </Box>
        
        <ProtectedComponent requiredRole="admin">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddNew}
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          >
            Add Package
          </Button>
        </ProtectedComponent>
      </Box>

      {/* Overview Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1 }}>
              <LocalOfferIcon />
            </Avatar>
            <Typography variant="h4" fontWeight={600} color="primary.main">
              {overviewStats.totalPackages}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Packages
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 1 }}>
              <TrendingUpIcon />
            </Avatar>
            <Typography variant="h4" fontWeight={600} color="success.main">
              {overviewStats.activePackages}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Active Packages
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 1 }}>
              <GroupIcon />
            </Avatar>
            <Typography variant="h4" fontWeight={600} color="warning.main">
              {overviewStats.totalSubscriptions}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Subscriptions
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1 }}>
              <AttachMoneyIcon />
            </Avatar>
            <Typography variant="h4" fontWeight={600} color="info.main">
              ${overviewStats.totalRevenue.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Revenue
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Packages Grid */}
      {packages.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            No membership packages found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first membership package to get started
          </Typography>
          <ProtectedComponent requiredRole="admin">
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddNew}>
              Create First Package
            </Button>
          </ProtectedComponent>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {packages
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((pkg) => (
              <Grid item xs={12} sm={6} lg={4} key={pkg.id}>
                {renderPackageCard(pkg)}
              </Grid>
            ))}
        </Grid>
      )}

      {/* Mobile FAB */}
      <ProtectedComponent requiredRole="admin">
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: { xs: 'flex', sm: 'none' },
          }}
          onClick={handleAddNew}
        >
          <AddIcon />
        </Fab>
      </ProtectedComponent>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItemComponent onClick={() => selectedPackage && handleEdit(selectedPackage)}>
          <EditIcon sx={{ mr: 1, fontSize: 20 }} />
          Edit Package
        </MenuItemComponent>
        
        <MenuItemComponent onClick={() => selectedPackage && handleToggleStatus(selectedPackage)}>
          {selectedPackage?.status === 'Active' ? (
            <>
              <VisibilityOffIcon sx={{ mr: 1, fontSize: 20 }} />
              Deactivate
            </>
          ) : (
            <>
              <VisibilityIcon sx={{ mr: 1, fontSize: 20 }} />
              Activate
            </>
          )}
        </MenuItemComponent>
        
        <Divider />
        
        <MenuItemComponent 
          onClick={() => selectedPackage && handleDeleteClick(selectedPackage)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
          Delete Package
        </MenuItemComponent>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the package "{packageToDelete?.name}"? 
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Form Dialog */}
      <MembershipPackageForm
        open={openForm}
        onClose={handleFormClose}
        editData={editData}
      />
    </Container>
  );
};

export default MembershipPackagesPage;