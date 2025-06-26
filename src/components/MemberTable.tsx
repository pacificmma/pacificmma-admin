// src/components/MemberTable.tsx - Optimized with intelligent caching and request management

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
  Avatar,
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
  Snackbar,
  Skeleton,
  Fab,
  Badge,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearIcon from '@mui/icons-material/Clear';
import TuneIcon from '@mui/icons-material/Tune';
import { format } from 'date-fns';
import { 
  MemberRecord, 
  MemberStatus,
  MembershipType 
} from '../types/members';
import { 
  getAllMembers,
  deleteMember, 
  updateMembershipStatus,
  subscribeMemberUpdates,
  searchMembers,
  getMemberStats,
  clearMemberCache,
  getCacheStats,
} from '../services/memberService';
import { useRoleControl } from '../hooks/useRoleControl';

interface MemberTableProps {
  refreshTrigger?: number;
  onEdit: (memberData: MemberRecord) => void;
  onDataLoaded?: (data: { memberList: MemberRecord[] }) => void;
}

interface LoadingState {
  initial: boolean;
  refresh: boolean;
  delete: string | null;
  statusUpdate: string | null;
  search: boolean;
}

interface FilterState {
  searchTerm: string;
  statusFilter: 'all' | MemberStatus;
  membershipTypeFilter: 'all' | MembershipType;
  tagFilter: string;
}

interface DialogState {
  delete: {
    open: boolean;
    member: MemberRecord | null;
  };
  statusUpdate: {
    open: boolean;
    member: MemberRecord | null;
    newStatus: MemberStatus;
  };
}

const SEARCH_DEBOUNCE_MS = 300;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const MemberTable: React.FC<MemberTableProps> = ({ 
  refreshTrigger, 
  onEdit, 
  onDataLoaded 
}) => {
  // State management
  const [memberList, setMemberList] = useState<MemberRecord[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    initial: true,
    refresh: false,
    delete: null,
    statusUpdate: null,
    search: false,
  });
  
  const [dialogs, setDialogs] = useState<DialogState>({
    delete: { open: false, member: null },
    statusUpdate: { open: false, member: null, newStatus: 'No Membership' },
  });
  
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  
  // Filters and search
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    statusFilter: 'all',
    membershipTypeFilter: 'all',
    tagFilter: '',
  });
  
  const [tabValue, setTabValue] = useState(0);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);

  // Refs for optimization
  const searchTimeoutRef = useRef<number | null>(null);
  const refreshIntervalRef = useRef<number | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastRefreshRef = useRef<number>(0);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAdmin, userData } = useRoleControl();

  // Memoized member stats
  const memberStats = useMemo(() => {
    try {
      const stats = {
        all: memberList.length,
        active: 0,
        inactive: 0,
        paused: 0,
        overdue: 0,
        noMembership: 0,
      };

      memberList.forEach(member => {
        try {
          const status = member?.membership?.status;
          switch (status) {
            case 'Active':
              stats.active++;
              break;
            case 'Paused':
              stats.paused++;
              stats.inactive++;
              break;
            case 'Overdue':
              stats.overdue++;
              stats.inactive++;
              break;
            case 'No Membership':
            default:
              stats.noMembership++;
              stats.inactive++;
              break;
          }
        } catch (err) {
          console.warn('Error calculating stats for member:', member?.id, err);
        }
      });

      return stats;
    } catch (error) {
      console.error('Error calculating member stats:', error);
      return { all: 0, active: 0, inactive: 0, paused: 0, overdue: 0, noMembership: 0 };
    }
  }, [memberList]);

  // Debounced search function
  const debouncedSearch = useCallback((searchTerm: string, otherFilters: Partial<FilterState>) => {
    if (searchTimeoutRef.current !== null) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      if (!searchTerm.trim() && 
          otherFilters.statusFilter === 'all' && 
          otherFilters.membershipTypeFilter === 'all' &&
          !otherFilters.tagFilter) {
        // No filters applied, use cached data
        setFilteredMembers(memberList);
        return;
      }

      try {
        setLoading(prev => ({ ...prev, search: true }));
        
        const searchFilters: any = {};
        if (otherFilters.statusFilter && otherFilters.statusFilter !== 'all') {
          searchFilters.status = otherFilters.statusFilter;
        }
        if (otherFilters.membershipTypeFilter && otherFilters.membershipTypeFilter !== 'all') {
          searchFilters.membershipType = otherFilters.membershipTypeFilter;
        }
        if (otherFilters.tagFilter) {
          searchFilters.tags = [otherFilters.tagFilter];
        }

        const results = await searchMembers(searchTerm, searchFilters);
        setFilteredMembers(results);
      } catch (err) {
        console.error('Search error:', err);
        setError('Search failed. Please try again.');
      } finally {
        setLoading(prev => ({ ...prev, search: false }));
      }
    }, SEARCH_DEBOUNCE_MS);
  }, [memberList]);

  // Filter handler
  const handleFilterChange = useCallback((field: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    
    // Apply tab filter
    let statusFilter = newFilters.statusFilter;
    switch (tabValue) {
      case 1: // Active
        statusFilter = 'Active';
        break;
      case 2: // Inactive
        // Keep current filter or default to 'all' for inactive
        break;
      default:
        // All members - use selected filter
        break;
    }

    debouncedSearch(newFilters.searchTerm, {
      ...newFilters,
      statusFilter,
    });
  }, [filters, tabValue, debouncedSearch]);

  // Tab change handler
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    let statusFilter: 'all' | MemberStatus = 'all';
    switch (newValue) {
      case 1: // Active
        statusFilter = 'Active';
        break;
      case 2: // Inactive  
        // For inactive, we'll filter locally since it includes multiple statuses
        const inactiveMembers = memberList.filter(member => {
          const status = member?.membership?.status;
          return status === 'Paused' || status === 'Overdue' || status === 'No Membership' || !status;
        });
        setFilteredMembers(inactiveMembers);
        return;
    }

    // For other tabs, use search with status filter
    debouncedSearch(filters.searchTerm, {
      ...filters,
      statusFilter,
    });
  }, [memberList, filters, debouncedSearch]);

  // Fetch members with intelligent caching
  const fetchMembers = useCallback(async (forceRefresh = false) => {
    try {
      const now = Date.now();
      const shouldRefresh = forceRefresh || (now - lastRefreshRef.current) > REFRESH_INTERVAL_MS;
      
      setLoading(prev => ({ 
        ...prev, 
        initial: !memberList.length,
        refresh: shouldRefresh && memberList.length > 0,
      }));
      
      setError(null);
      
      console.log('Fetching members...', { forceRefresh, shouldRefresh });
      
      // Use cache for normal loads, force refresh when needed
      const members = await getAllMembers(!shouldRefresh, true);
      
      setMemberList(members);
      setFilteredMembers(members);
      lastRefreshRef.current = now;
      
      // Pass data to parent component for stats calculation
      if (onDataLoaded) {
        onDataLoaded({ memberList: members });
      }
      
      // Update cache stats
      setCacheInfo(getCacheStats());
      
      console.log(`Loaded ${members.length} members`);
    } catch (err: any) {
      console.error('Error loading members:', err);
      
      // Provide specific error messages
      let errorMessage = 'An error occurred while loading members';
      
      if (err.code === 'permission-denied') {
        errorMessage = 'You do not have permission to view member data';
      } else if (err.code === 'unavailable') {
        errorMessage = 'Service is currently unavailable. Please try again later';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(prev => ({
        ...prev,
        initial: false,
        refresh: false,
      }));
    }
  }, [memberList.length, onDataLoaded]);

  // Subscribe to real-time updates
  useEffect(() => {
    // Initial load
    fetchMembers();

    // Set up real-time subscription
    const unsubscribe = subscribeMemberUpdates((updatedMembers) => {
      console.log('Real-time member update received:', updatedMembers.length);
      setMemberList(updatedMembers);
      
      // Re-apply current filters
      if (filters.searchTerm || filters.statusFilter !== 'all' || filters.membershipTypeFilter !== 'all') {
        handleFilterChange('searchTerm', filters.searchTerm);
      } else {
        setFilteredMembers(updatedMembers);
      }
      
      if (onDataLoaded) {
        onDataLoaded({ memberList: updatedMembers });
      }
    });

    unsubscribeRef.current = unsubscribe;

    // Set up periodic refresh
    refreshIntervalRef.current = window.setInterval(() => {
      fetchMembers(true);
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (refreshIntervalRef.current !== null) {
        clearInterval(refreshIntervalRef.current);
      }
      if (searchTimeoutRef.current !== null) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Handle refresh trigger from parent
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchMembers(true);
    }
  }, [refreshTrigger, fetchMembers]);

  // Auto-clear success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Dialog management functions
  const handleDeleteClick = useCallback((member: MemberRecord) => {
    if (!member?.id) {
      setError('Invalid member selected for deletion');
      return;
    }
    
    setDialogs(prev => ({
      ...prev,
      delete: { open: true, member }
    }));
    handleMenuClose();
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    const { member } = dialogs.delete;
    
    if (!member || !userData) {
      setError('Cannot delete member: Invalid data or user not authenticated');
      return;
    }

    setLoading(prev => ({ ...prev, delete: member.id }));
    
    try {
      await deleteMember(member.id, userData.uid);
      
      setDialogs(prev => ({
        ...prev,
        delete: { open: false, member: null }
      }));
      
      setSuccessMessage(`Member ${member.firstName} ${member.lastName} has been deactivated`);
      
      // Refresh data
      await fetchMembers(true);
    } catch (err: any) {
      console.error('Error deleting member:', err);
      setError(`Failed to deactivate member: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(prev => ({ ...prev, delete: null }));
    }
  }, [dialogs.delete, userData, fetchMembers]);

  const handleDeleteCancel = useCallback(() => {
    setDialogs(prev => ({
      ...prev,
      delete: { open: false, member: null }
    }));
  }, []);

  const handleStatusClick = useCallback((member: MemberRecord, status: MemberStatus) => {
    if (!member?.id) {
      setError('Invalid member selected for status update');
      return;
    }

    setDialogs(prev => ({
      ...prev,
      statusUpdate: { open: true, member, newStatus: status }
    }));
    handleMenuClose();
  }, []);

  const handleStatusConfirm = useCallback(async () => {
    const { member, newStatus } = dialogs.statusUpdate;
    
    if (!member || !userData) {
      setError('Cannot update status: Invalid data or user not authenticated');
      return;
    }

    setLoading(prev => ({ ...prev, statusUpdate: member.id }));
    
    try {
      await updateMembershipStatus(member.id, newStatus, userData.uid);
      
      setDialogs(prev => ({
        ...prev,
        statusUpdate: { open: false, member: null, newStatus: 'No Membership' }
      }));
      
      const statusAction = getStatusActionName(newStatus);
      setSuccessMessage(`${member.firstName} ${member.lastName} has been marked as ${statusAction}`);
      
      // Refresh data
      await fetchMembers(true);
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(`Failed to update status: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(prev => ({ ...prev, statusUpdate: null }));
    }
  }, [dialogs.statusUpdate, userData, fetchMembers]);

  const handleStatusCancel = useCallback(() => {
    setDialogs(prev => ({
      ...prev,
      statusUpdate: { open: false, member: null, newStatus: 'No Membership' }
    }));
  }, []);

  // Menu handling
  const handleMenuClick = useCallback((event: React.MouseEvent<HTMLElement>, member: MemberRecord) => {
    if (!member?.id) {
      setError('Invalid member selected');
      return;
    }
    
    setAnchorEl(event.currentTarget);
    setSelectedMember(member);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setSelectedMember(null);
  }, []);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    fetchMembers(true);
  }, [fetchMembers]);

  // Clear cache
  const handleClearCache = useCallback(() => {
    clearMemberCache();
    setCacheInfo(getCacheStats());
    fetchMembers(true);
    setSuccessMessage('Cache cleared and data refreshed');
  }, [fetchMembers]);

  // Clear filters
  const handleClearFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      statusFilter: 'all',
      membershipTypeFilter: 'all',
      tagFilter: '',
    });
    setTabValue(0);
    setFilteredMembers(memberList);
  }, [memberList]);

  // Utility functions
  const getStatusColor = useCallback((status: MemberStatus) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Paused':
        return 'warning';
      case 'Overdue':
        return 'error';
      case 'No Membership':
      default:
        return 'default';
    }
  }, []);

  const getStatusIcon = useCallback((status: MemberStatus) => {
    switch (status) {
      case 'Active':
        return <CheckCircleIcon />;
      case 'Paused':
        return <PauseCircleIcon />;
      case 'Overdue':
        return <ErrorIcon />;
      case 'No Membership':
      default:
        return <PersonOffIcon />;
    }
  }, []);

  const getStatusActionName = useCallback((status: MemberStatus): string => {
    switch (status) {
      case 'Active':
        return 'Active';
      case 'Paused':
        return 'Paused';
      case 'Overdue':
        return 'Overdue';
      case 'No Membership':
        return 'No Membership';
      default:
        return status;
    }
  }, []);

  const getStatusDescription = useCallback((status: MemberStatus): string => {
    switch (status) {
      case 'Active':
        return 'Member will have access to all services and can book classes.';
      case 'Paused':
        return 'Member account will be temporarily suspended but can be reactivated.';
      case 'Overdue':
        return 'Member will be marked as overdue for payments but account remains accessible.';
      case 'No Membership':
        return 'Member will have no active membership or access to services.';
      default:
        return 'This will change the member\'s current status.';
    }
  }, []);

  const formatDate = useCallback((date: any) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return format(dateObj, 'MMM dd, yyyy');
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'Invalid Date';
    }
  }, []);

  const getMemberInitials = useCallback((member: MemberRecord) => {
    try {
      const firstName = member?.firstName || '';
      const lastName = member?.lastName || '';
      
      const firstInitial = firstName.length > 0 ? firstName.charAt(0).toUpperCase() : '';
      const lastInitial = lastName.length > 0 ? lastName.charAt(0).toUpperCase() : '';
      
      return `${firstInitial}${lastInitial}` || '??';
    } catch (error) {
      console.warn('Error generating initials for member:', member?.id, error);
      return '??';
    }
  }, []);

  const getSafeValue = useCallback((value: any, fallback: string = 'N/A') => {
    try {
      return value && value.toString().trim() ? value : fallback;
    } catch (error) {
      return fallback;
    }
  }, []);

  // Loading states
  if (loading.initial) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: 200,
        mt: 2
      }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading members...</Typography>
      </Box>
    );
  }

  // Error state with retry option
  if (error && memberList.length === 0) {
    return (
      <Paper sx={{ p: 3, mt: 2 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Paper>
    );
  }

  // Empty state
  if (memberList.length === 0 && !loading.initial) {
    return (
      <Paper sx={{ p: 3, mt: 2, textAlign: 'center' }}>
        <PersonIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
          No members found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first member to get started.
        </Typography>
        <Button 
          variant="outlined" 
          onClick={handleRefresh} 
          sx={{ mt: 2 }}
          startIcon={<RefreshIcon />}
        >
          Refresh
        </Button>
      </Paper>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <>
        {/* Success/Error Messages */}
        <Snackbar
          open={!!successMessage}
          autoHideDuration={5000}
          onClose={() => setSuccessMessage(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="success" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        </Snackbar>

        {error && memberList.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Search and Filters */}
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TextField
              placeholder="Search members..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              size="small"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: loading.search && (
                  <InputAdornment position="end">
                    <CircularProgress size={20} />
                  </InputAdornment>
                ),
              }}
            />
            {loading.refresh && <CircularProgress size={20} />}
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.statusFilter}
                label="Status"
                onChange={(e) => handleFilterChange('statusFilter', e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Paused">Paused</MenuItem>
                <MenuItem value="Overdue">Overdue</MenuItem>
                <MenuItem value="No Membership">No Membership</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.membershipTypeFilter}
                label="Type"
                onChange={(e) => handleFilterChange('membershipTypeFilter', e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="Recurring">Recurring</MenuItem>
                <MenuItem value="Prepaid">Prepaid</MenuItem>
              </Select>
            </FormControl>

            <IconButton 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              color={showAdvancedFilters ? 'primary' : 'default'}
            >
              <TuneIcon />
            </IconButton>
          </Box>

          {showAdvancedFilters && (
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <TextField
                label="Filter by Tag"
                size="small"
                fullWidth
                value={filters.tagFilter}
                onChange={(e) => handleFilterChange('tagFilter', e.target.value)}
                placeholder="Enter tag name..."
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleClearFilters}
                  startIcon={<ClearIcon />}
                >
                  Clear Filters
                </Button>
                
                {isAdmin && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleClearCache}
                    startIcon={<RefreshIcon />}
                  >
                    Clear Cache
                  </Button>
                )}
              </Box>
              
              {cacheInfo && isAdmin && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Cache: {cacheInfo.size} items, {cacheInfo.activeListeners} listeners
                </Typography>
              )}
            </Box>
          )}
        </Paper>

        {/* Member Cards */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: 2,
          mt: 1 
        }}>
          {filteredMembers.map((member) => (
            <Card key={member.id} sx={{ elevation: 1 }}>
              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                      {getMemberInitials(member)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        {getSafeValue(member?.firstName, 'Unknown')} {getSafeValue(member?.lastName, 'Member')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Member since {formatDate(member?.joinDate)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      icon={getStatusIcon(member?.membership?.status || 'No Membership')}
                      label={member?.membership?.status || 'No Membership'}
                      color={getStatusColor(member?.membership?.status || 'No Membership') as any}
                      size="small"
                    />
                    {isAdmin && (
                      <IconButton
                        onClick={(e) => handleMenuClick(e, member)}
                        size="small"
                        disabled={loading.delete === member.id || loading.statusUpdate === member.id}
                      >
                        {(loading.delete === member.id || loading.statusUpdate === member.id) ? (
                          <CircularProgress size={20} />
                        ) : (
                          <MoreVertIcon />
                        )}
                      </IconButton>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {getSafeValue(member?.email, 'No email')}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {getSafeValue(member?.phone, 'No phone')}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CreditCardIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {getSafeValue(member?.membership?.type, 'No Membership')}
                      {member?.membership?.type === 'Recurring' && member?.membership?.monthlyAmount && 
                        ` - ${member.membership.monthlyAmount}/month`
                      }
                      {member?.membership?.type === 'Prepaid' && member?.membership?.remainingCredits !== undefined && 
                        ` - ${member.membership.remainingCredits} credits left`
                      }
                    </Typography>
                  </Box>

                  {member?.membership?.status === 'Active' && member?.lastVisit && (
                    <Typography variant="caption" color="text.secondary">
                      Last visit: {formatDate(member.lastVisit)}
                    </Typography>
                  )}
                </Box>

                {member.tags && member.tags.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {member.tags.slice(0, 3).map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))}
                    {member.tags.length > 3 && (
                      <Chip
                        label={`+${member.tags.length - 3}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Floating Action Button for Advanced Functions */}
        {isAdmin && (
          <Fab
            sx={{
              position: 'fixed',
              bottom: 16,
              left: 16,
              zIndex: theme.zIndex.speedDial,
            }}
            size="small"
            color="secondary"
            onClick={handleRefresh}
            disabled={loading.refresh}
          >
            {loading.refresh ? <CircularProgress size={24} /> : <RefreshIcon />}
          </Fab>
        )}
      </>
    );
  }

  // Desktop table view
  return (
    <>
      {/* Success/Error Messages */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={5000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>

      {error && memberList.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters and Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`All Members (${memberStats.all})`} />
          <Tab 
            label={
              <Badge badgeContent={memberStats.active} color="success" showZero>
                Active
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={memberStats.inactive} color="warning" showZero>
                Inactive
              </Badge>
            } 
          />
        </Tabs>
        
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search members..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            size="small"
            sx={{ minWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: loading.search && (
                <InputAdornment position="end">
                  <CircularProgress size={20} />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.statusFilter}
              label="Status"
              onChange={(e) => handleFilterChange('statusFilter', e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Paused">Paused</MenuItem>
              <MenuItem value="Overdue">Overdue</MenuItem>
              <MenuItem value="No Membership">No Membership</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={filters.membershipTypeFilter}
              label="Type"
              onChange={(e) => handleFilterChange('membershipTypeFilter', e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="Recurring">Recurring</MenuItem>
              <MenuItem value="Prepaid">Prepaid</MenuItem>
            </Select>
          </FormControl>

          <Button
            onClick={handleRefresh}
            disabled={loading.refresh}
            startIcon={loading.refresh ? <CircularProgress size={16} /> : <RefreshIcon />}
            size="small"
          >
            Refresh
          </Button>

          {isAdmin && (
            <Button
              onClick={handleClearCache}
              size="small"
              variant="outlined"
              startIcon={<ClearIcon />}
            >
              Clear Cache
            </Button>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            Showing {filteredMembers.length} of {memberList.length} members
          </Typography>
        </Box>

        {showAdvancedFilters && (
          <Box sx={{ px: 2, pb: 2 }}>
            <TextField
              label="Filter by Tag"
              size="small"
              value={filters.tagFilter}
              onChange={(e) => handleFilterChange('tagFilter', e.target.value)}
              placeholder="Enter tag name..."
              sx={{ mr: 2, minWidth: 200 }}
            />
            
            <Button
              size="small"
              variant="outlined"
              onClick={handleClearFilters}
              startIcon={<ClearIcon />}
            >
              Clear All Filters
            </Button>

            {cacheInfo && isAdmin && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                Cache: {cacheInfo.size} items, {cacheInfo.activeListeners} active listeners
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      {/* Desktop Table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Member
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Contact
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Membership
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Status
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Last Visit
              </TableCell>
              {isAdmin && (
                <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem', width: 100 }}>
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading.refresh && filteredMembers.length === 0 ? (
              // Show skeleton loading for refresh
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Skeleton variant="circular" width={40} height={40} />
                      <Box>
                        <Skeleton variant="text" width={120} height={20} />
                        <Skeleton variant="text" width={80} height={16} />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="text" width={150} height={20} />
                    <Skeleton variant="text" width={100} height={16} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="text" width={100} height={20} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1 }} />
                  </TableCell>
                  <TableCell>
                    <Skeleton variant="text" width={80} height={20} />
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Skeleton variant="circular" width={24} height={24} />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              filteredMembers.map((member) => (
                <TableRow
                  key={member.id}
                  sx={{
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover
                    },
                    '&:last-child td, &:last-child th': { border: 0 }
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                        {getMemberInitials(member)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {getSafeValue(member?.firstName, 'Unknown')} {getSafeValue(member?.lastName, 'Member')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Joined {formatDate(member?.joinDate)}
                        </Typography>
                        {member?.tags && member.tags.length > 0 && (
                          <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}>
                            {member.tags.slice(0, 2).map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                variant="outlined"
                                color="primary"
                                sx={{ fontSize: '0.7rem', height: 18 }}
                              />
                            ))}
                            {member.tags.length > 2 && (
                              <Typography variant="caption" color="text.secondary">
                                +{member.tags.length - 2} more
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  
                  <TableCell sx={{ fontSize: '0.9rem' }}>
                    <Box>
                      <Typography variant="body2">
                        {getSafeValue(member?.email, 'No email')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getSafeValue(member?.phone, 'No phone')}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell sx={{ fontSize: '0.9rem' }}>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {getSafeValue(member?.membership?.type, 'No Membership')}
                      </Typography>
                      {member?.membership?.type === 'Recurring' && member?.membership?.monthlyAmount && (
                        <Typography variant="body2" color="success.main">
                          ${member.membership.monthlyAmount}/month
                        </Typography>
                      )}
                      {member?.membership?.type === 'Prepaid' && member?.membership?.remainingCredits !== undefined && (
                        <Typography variant="body2" color="primary.main">
                          {member.membership.remainingCredits} credits left
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(member?.membership?.status || 'No Membership')}
                      label={member?.membership?.status || 'No Membership'}
                      color={getStatusColor(member?.membership?.status || 'No Membership') as any}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  
                  <TableCell sx={{ fontSize: '0.9rem' }}>
                    <Box>
                      <Typography variant="body2">
                        {member?.lastVisit ? formatDate(member.lastVisit) : 'Never'}
                      </Typography>
                      {(member?.totalVisits || 0) > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          {member.totalVisits} total visits
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  
                  {isAdmin && (
                    <TableCell>
                      <IconButton
                        onClick={(e) => handleMenuClick(e, member)}
                        size="small"
                        disabled={loading.delete === member.id || loading.statusUpdate === member.id}
                      >
                        {(loading.delete === member.id || loading.statusUpdate === member.id) ? (
                          <CircularProgress size={20} />
                        ) : (
                          <MoreVertIcon />
                        )}
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Admin Action Menu */}
      {isAdmin && (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {selectedMember && (
            <>
              <MenuItemComponent onClick={() => onEdit(selectedMember)}>
                <EditIcon sx={{ mr: 1 }} />
                Edit Member
              </MenuItemComponent>
              
              <Divider />
              
              <MenuItemComponent 
                onClick={() => handleStatusClick(selectedMember, 'Active')}
                disabled={selectedMember?.membership?.status === 'Active'}
              >
                <CheckCircleIcon sx={{ mr: 1 }} />
                Mark Active
              </MenuItemComponent>
              
              <MenuItemComponent 
                onClick={() => handleStatusClick(selectedMember, 'Paused')}
                disabled={selectedMember?.membership?.status === 'Paused'}
              >
                <PauseCircleIcon sx={{ mr: 1 }} />
                Mark Paused
              </MenuItemComponent>
              
              <MenuItemComponent 
                onClick={() => handleStatusClick(selectedMember, 'Overdue')}
                disabled={selectedMember?.membership?.status === 'Overdue'}
              >
                <ErrorIcon sx={{ mr: 1 }} />
                Mark Overdue
              </MenuItemComponent>
              
              <Divider />
              
              <MenuItemComponent 
                onClick={() => handleDeleteClick(selectedMember)}
                sx={{ color: 'error.main' }}
              >
                <DeleteIcon sx={{ mr: 1 }} />
                Deactivate
              </MenuItemComponent>
            </>
          )}
        </Menu>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={dialogs.delete.open} 
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Deactivate Member
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to deactivate{' '}
            <strong>
              {dialogs.delete.member?.firstName} {dialogs.delete.member?.lastName}
            </strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This will mark the member as inactive but preserve their data. The member can be reactivated later if needed.
            Their customer portal access will also be disabled.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteCancel} 
            disabled={loading.delete !== null}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="warning" 
            variant="contained"
            disabled={loading.delete !== null}
            startIcon={loading.delete ? <CircularProgress size={16} /> : <PersonOffIcon />}
          >
            {loading.delete ? 'Deactivating...' : 'Deactivate Member'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Change Confirmation Dialog */}
      <Dialog 
        open={dialogs.statusUpdate.open} 
        onClose={handleStatusCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getStatusIcon(dialogs.statusUpdate.newStatus)}
          Update Membership Status
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Are you sure you want to change the membership status of{' '}
            <strong>
              {dialogs.statusUpdate.member?.firstName} {dialogs.statusUpdate.member?.lastName}
            </strong>{' '}
            to <strong>{getStatusActionName(dialogs.statusUpdate.newStatus)}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {getStatusDescription(dialogs.statusUpdate.newStatus)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleStatusCancel} 
            disabled={loading.statusUpdate !== null}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleStatusConfirm} 
            color="primary" 
            variant="contained"
            disabled={loading.statusUpdate !== null}
            startIcon={
              loading.statusUpdate ? 
                <CircularProgress size={16} /> : 
                getStatusIcon(dialogs.statusUpdate.newStatus)
            }
          >
            {loading.statusUpdate ? 
              'Updating...' : 
              `Mark as ${getStatusActionName(dialogs.statusUpdate.newStatus)}`
            }
          </Button>
        </DialogActions>
      </Dialog>

      {/* No filtered results */}
      {filteredMembers.length === 0 && memberList.length > 0 && !loading.refresh && !loading.search && (
        <Paper sx={{ p: 3, mt: 2, textAlign: 'center' }}>
          <FilterListIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No members match your filters
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Try adjusting your search term or filters to see more results.
          </Typography>
          <Button 
            variant="outlined" 
            onClick={handleClearFilters}
            startIcon={<ClearIcon />}
          >
            Clear Filters
          </Button>
        </Paper>
      )}
    </>
  );
};

export default MemberTable;