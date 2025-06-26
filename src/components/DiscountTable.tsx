// src/components/DiscountTable.tsx

import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  TableContainer,
  Typography,
  CircularProgress,
  Box,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Tooltip,
  Menu,
  MenuItem as MenuItemComponent,
  Divider,
  LinearProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import PercentIcon from '@mui/icons-material/Percent';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { format } from 'date-fns';
import { 
  DiscountRecord, 
  DiscountStatus,
  DiscountType,
  DiscountAppliesTo 
} from '../types/discount';
import { 
  getAllDiscounts, 
  deleteDiscount, 
  updateDiscount,
  getDiscountUsages 
} from '../services/discountService';
import { useRoleControl } from '../hooks/useRoleControl';

interface DiscountTableProps {
  refreshTrigger?: number;
  onEdit: (discountData: DiscountRecord) => void;
  onDataLoaded?: (data: { discountList: DiscountRecord[] }) => void;
}

const DiscountTable: React.FC<DiscountTableProps> = ({ 
  refreshTrigger, 
  onEdit, 
  onDataLoaded 
}) => {
  const [discountList, setDiscountList] = useState<DiscountRecord[]>([]);
  const [filteredDiscounts, setFilteredDiscounts] = useState<DiscountRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState<DiscountRecord | null>(null);
  const [selectedDiscountUsages, setSelectedDiscountUsages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DiscountStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | DiscountType>('all');
  const [tabValue, setTabValue] = useState(0);
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountRecord | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAdmin, userData } = useRoleControl();

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching discounts...');
      const discounts = await getAllDiscounts();
      
      setDiscountList(discounts);
      
      // Pass data to parent component for stats calculation
      if (onDataLoaded) {
        onDataLoaded({ discountList: discounts });
      }
      
      console.log(`Loaded ${discounts.length} discounts`);
    } catch (err: any) {
      console.error('Error loading discounts:', err);
      setError(err.message || 'An error occurred while loading discounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, [refreshTrigger]);

  // Filter discounts based on search term and filters
  useEffect(() => {
    let filtered = discountList;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(discount =>
        discount.code.toLowerCase().includes(term) ||
        discount.name.toLowerCase().includes(term) ||
        (discount.description || '').toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(discount => discount.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(discount => discount.type === typeFilter);
    }

    // Tab filter
    switch (tabValue) {
      case 1: // Active
        filtered = filtered.filter(discount => discount.status === 'Active' && discount.isActive);
        break;
      case 2: // Inactive
        filtered = filtered.filter(discount => 
          discount.status !== 'Active' || !discount.isActive
        );
        break;
      // case 0 is 'All' - no additional filtering
    }

    setFilteredDiscounts(filtered);
  }, [discountList, searchTerm, statusFilter, typeFilter, tabValue]);

  const handleDeleteClick = (discount: DiscountRecord) => {
    setDiscountToDelete(discount);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!discountToDelete || !userData) return;

    setDeleteLoading(discountToDelete.id);
    try {
      await deleteDiscount(discountToDelete.id);
      await fetchDiscounts();
      setDeleteDialogOpen(false);
      setDiscountToDelete(null);
    } catch (err: any) {
      console.error('Error deleting discount:', err);
      setError('An error occurred while deleting: ' + err.message);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDiscountToDelete(null);
  };

  const handleToggleStatus = async (discount: DiscountRecord) => {
    if (!userData) return;

    setStatusLoading(discount.id);
    try {
      await updateDiscount(discount.id, { isActive: !discount.isActive }, userData.uid);
      await fetchDiscounts();
    } catch (err: any) {
      console.error('Error updating discount status:', err);
      setError('An error occurred while updating status: ' + err.message);
    } finally {
      setStatusLoading(null);
    }
    handleMenuClose();
  };

  const handleViewUsages = async (discount: DiscountRecord) => {
    try {
      const usages = await getDiscountUsages(discount.id);
      setSelectedDiscountUsages(usages);
      setUsageDialogOpen(true);
    } catch (error) {
      console.error('Error fetching discount usages:', error);
      setError('Failed to load discount usage history');
    }
    handleMenuClose();
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      // You could show a snackbar here
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
    handleMenuClose();
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, discount: DiscountRecord) => {
    setAnchorEl(event.currentTarget);
    setSelectedDiscount(discount);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDiscount(null);
  };

  const getStatusColor = (status: DiscountStatus) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Expired':
        return 'warning';
      case 'Used Up':
        return 'error';
      case 'Disabled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type: DiscountType) => {
    return type === 'percentage' ? <PercentIcon /> : <AttachMoneyIcon />;
  };

  const formatDate = (date: any) => {
    if (!date) return 'No expiry';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return format(dateObj, 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getUsageProgress = (discount: DiscountRecord) => {
    if (!discount.maxUses) return null;
    return (discount.currentUses / discount.maxUses) * 100;
  };

  const getAppliesDisplay = (appliesTo: DiscountAppliesTo) => {
    switch (appliesTo) {
      case 'all':
        return 'Everything';
      case 'classes':
        return 'Classes';
      case 'workshops':
        return 'Workshops';
      case 'packages':
        return 'Packages';
      case 'specific_items':
        return 'Specific Items';
      default:
        return appliesTo;
    }
  };

  // Stats for tabs
  const discountStats = useMemo(() => {
    const stats = {
      all: discountList.length,
      active: discountList.filter(d => d.status === 'Active' && d.isActive).length,
      inactive: discountList.filter(d => d.status !== 'Active' || !d.isActive).length,
    };
    return stats;
  }, [discountList]);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: 200,
        mt: 2
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, mt: 2 }}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Paper>
    );
  }

  if (discountList.length === 0) {
    return (
      <Paper sx={{ p: 3, mt: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No discount codes found. Create your first discount to get started.
        </Typography>
      </Paper>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <>
        {/* Search and Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <TextField
            placeholder="Search discount codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Expired">Expired</MenuItem>
                <MenuItem value="Used Up">Used Up</MenuItem>
                <MenuItem value="Disabled">Disabled</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                label="Type"
                onChange={(e) => setTypeFilter(e.target.value as any)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="percentage">Percentage</MenuItem>
                <MenuItem value="fixed_amount">Fixed Amount</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* Discount Cards */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: 2,
          mt: 1 
        }}>
          {filteredDiscounts.map((discount) => (
            <Card key={discount.id} sx={{ elevation: 1 }}>
              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        {discount.code}
                      </Typography>
                      <Chip
                        icon={getTypeIcon(discount.type)}
                        label={discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value}`}
                        color="primary"
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {discount.name}
                    </Typography>
                    {discount.description && (
                      <Typography variant="caption" color="text.secondary">
                        {discount.description}
                      </Typography>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={discount.status}
                      color={getStatusColor(discount.status) as any}
                      size="small"
                    />
                    {isAdmin && (
                      <IconButton
                        onClick={(e) => handleMenuClick(e, discount)}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(discount.startDate)} - {formatDate(discount.endDate)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Applies to: {getAppliesDisplay(discount.appliesTo)}
                    </Typography>
                  </Box>
                  
                  {discount.maxUses && (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Usage: {discount.currentUses}/{discount.maxUses}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getUsageProgress(discount)?.toFixed(0)}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={getUsageProgress(discount) || 0} 
                        sx={{ height: 4, borderRadius: 2 }}
                      />
                    </Box>
                  )}

                  {discount.minimumAmount && (
                    <Typography variant="caption" color="text.secondary">
                      Min. purchase: ${discount.minimumAmount}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {selectedDiscount && (
            <>
              <MenuItemComponent onClick={() => handleCopyCode(selectedDiscount.code)}>
                <ContentCopyIcon sx={{ mr: 1 }} />
                Copy Code
              </MenuItemComponent>
              
              <MenuItemComponent onClick={() => onEdit(selectedDiscount)}>
                <EditIcon sx={{ mr: 1 }} />
                Edit Discount
              </MenuItemComponent>
              
              <MenuItemComponent onClick={() => handleViewUsages(selectedDiscount)}>
                <VisibilityIcon sx={{ mr: 1 }} />
                View Usage History
              </MenuItemComponent>
              
              <Divider />
              
              <MenuItemComponent 
                onClick={() => handleToggleStatus(selectedDiscount)}
                disabled={statusLoading === selectedDiscount.id}
              >
                {selectedDiscount.isActive ? <VisibilityOffIcon sx={{ mr: 1 }} /> : <VisibilityIcon sx={{ mr: 1 }} />}
                {selectedDiscount.isActive ? 'Disable' : 'Enable'}
              </MenuItemComponent>
              
              <Divider />
              
              <MenuItemComponent 
                onClick={() => handleDeleteClick(selectedDiscount)}
                sx={{ color: 'error.main' }}
              >
                <DeleteIcon sx={{ mr: 1 }} />
                Delete
              </MenuItemComponent>
            </>
          )}
        </Menu>
      </>
    );
  }

  // Desktop table view
  return (
    <>
      {/* Filters and Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`All Discounts (${discountStats.all})`} />
          <Tab label={`Active (${discountStats.active})`} />
          <Tab label={`Inactive (${discountStats.inactive})`} />
        </Tabs>
        
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search discount codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Expired">Expired</MenuItem>
              <MenuItem value="Used Up">Used Up</MenuItem>
              <MenuItem value="Disabled">Disabled</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              label="Type"
              onChange={(e) => setTypeFilter(e.target.value as any)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="percentage">Percentage</MenuItem>
              <MenuItem value="fixed_amount">Fixed Amount</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            Showing {filteredDiscounts.length} of {discountList.length} discounts
          </Typography>
        </Box>
      </Paper>

      {/* Desktop Table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Discount Code
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Details
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Value
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Validity
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Usage
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Status
              </TableCell>
              {isAdmin && (
                <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem', width: 100 }}>
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDiscounts.map((discount) => (
              <TableRow
                key={discount.id}
                sx={{
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover
                  },
                  '&:last-child td, &:last-child th': { border: 0 }
                }}
              >
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {discount.code}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {discount.name}
                    </Typography>
                    {discount.description && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {discount.description.length > 50 
                          ? `${discount.description.substring(0, 50)}...`
                          : discount.description
                        }
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                
                <TableCell sx={{ fontSize: '0.9rem' }}>
                  <Box>
                    <Typography variant="body2">
                      Applies to: {getAppliesDisplay(discount.appliesTo)}
                    </Typography>
                    {discount.minimumAmount && (
                      <Typography variant="caption" color="text.secondary">
                        Min. purchase: ${discount.minimumAmount}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Chip
                    icon={getTypeIcon(discount.type)}
                    label={discount.type === 'percentage' ? `${discount.value}%` : `${discount.value}`}
                    color="primary"
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                
                <TableCell sx={{ fontSize: '0.9rem' }}>
                  <Box>
                    <Typography variant="body2">
                      From: {formatDate(discount.startDate)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      To: {formatDate(discount.endDate)}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Box>
                    {discount.maxUses ? (
                      <>
                        <Typography variant="body2">
                          {discount.currentUses}/{discount.maxUses} uses
                        </Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={getUsageProgress(discount) || 0} 
                          sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                        />
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {discount.currentUses} uses (unlimited)
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Chip
                    label={discount.status}
                    color={getStatusColor(discount.status) as any}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                
                {isAdmin && (
                  <TableCell>
                    <IconButton
                      onClick={(e) => handleMenuClick(e, discount)}
                      size="small"
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {selectedDiscount && (
          <>
            <MenuItemComponent onClick={() => handleCopyCode(selectedDiscount.code)}>
              <ContentCopyIcon sx={{ mr: 1 }} />
              Copy Code
            </MenuItemComponent>
            
            <MenuItemComponent onClick={() => onEdit(selectedDiscount)}>
              <EditIcon sx={{ mr: 1 }} />
              Edit Discount
            </MenuItemComponent>
            
            <MenuItemComponent onClick={() => handleViewUsages(selectedDiscount)}>
              <VisibilityIcon sx={{ mr: 1 }} />
              View Usage History
            </MenuItemComponent>
            
            <Divider />
            
            <MenuItemComponent 
              onClick={() => handleToggleStatus(selectedDiscount)}
              disabled={statusLoading === selectedDiscount.id}
            >
              {selectedDiscount.isActive ? <VisibilityOffIcon sx={{ mr: 1 }} /> : <VisibilityIcon sx={{ mr: 1 }} />}
              {selectedDiscount.isActive ? 'Disable' : 'Enable'}
            </MenuItemComponent>
            
            <Divider />
            
            <MenuItemComponent 
              onClick={() => handleDeleteClick(selectedDiscount)}
              sx={{ color: 'error.main' }}
            >
              <DeleteIcon sx={{ mr: 1 }} />
              Delete
            </MenuItemComponent>
          </>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Discount Code</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the discount code <strong>{discountToDelete?.code}</strong>?
            <br />This action cannot be undone.
            {discountToDelete?.currentUses && discountToDelete.currentUses > 0 && (
              <>
                <br /><br />
                <Alert severity="warning">
                  This discount has been used {discountToDelete.currentUses} time{discountToDelete.currentUses !== 1 ? 's' : ''}. 
                  It will be disabled instead of deleted to preserve usage history.
                </Alert>
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleteLoading !== null}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Usage History Dialog */}
      <Dialog 
        open={usageDialogOpen} 
        onClose={() => setUsageDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Usage History</DialogTitle>
        <DialogContent>
          {selectedDiscountUsages.length === 0 ? (
            <Typography color="text.secondary">
              This discount code has not been used yet.
            </Typography>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Total uses: {selectedDiscountUsages.length}
              </Typography>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {selectedDiscountUsages.map((usage) => (
                  <Box key={usage.id} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {usage.itemName} ({usage.itemType})
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Used on {formatDate(usage.usedAt)} by {usage.usedByName}
                    </Typography>
                    <Typography variant="body2">
                      Original: ${usage.originalAmount} → Final: ${usage.finalAmount} 
                      (Saved: ${usage.discountAmount})
                    </Typography>
                    {usage.userName && (
                      <Typography variant="caption" color="text.secondary">
                        Customer: {usage.userName}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUsageDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DiscountTable;