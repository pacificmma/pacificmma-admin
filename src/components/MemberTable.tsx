// src/components/MemberTable.tsx

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
import { format } from 'date-fns';
import { 
  MemberRecord, 
  MemberStatus,
  MembershipType 
} from '../types/members';
import { 
  getAllMembers, 
  deleteMember, 
  updateMembershipStatus 
} from '../services/memberService';
import { useRoleControl } from '../hooks/useRoleControl';

interface MemberTableProps {
  refreshTrigger?: number;
  onEdit: (memberData: MemberRecord) => void;
  onDataLoaded?: (data: { memberList: MemberRecord[] }) => void;
}

const MemberTable: React.FC<MemberTableProps> = ({ 
  refreshTrigger, 
  onEdit, 
  onDataLoaded 
}) => {
  const [memberList, setMemberList] = useState<MemberRecord[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<MemberRecord | null>(null);
  const [memberToUpdate, setMemberToUpdate] = useState<MemberRecord | null>(null);
  const [newStatus, setNewStatus] = useState<MemberStatus>('No Membership');
  const [error, setError] = useState<string | null>(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MemberStatus>('all');
  const [membershipTypeFilter, setMembershipTypeFilter] = useState<'all' | MembershipType>('all');
  const [tabValue, setTabValue] = useState(0);
  
  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAdmin, userData } = useRoleControl();

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching members...');
      const members = await getAllMembers();
      
      setMemberList(members);
      
      // Pass data to parent component for stats calculation
      if (onDataLoaded) {
        onDataLoaded({ memberList: members });
      }
      
      console.log(`Loaded ${members.length} members`);
    } catch (err: any) {
      console.error('Error loading members:', err);
      setError(err.message || 'An error occurred while loading members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [refreshTrigger]);

  // Filter members based on search term and filters
  useEffect(() => {
    let filtered = memberList;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(member =>
        (member?.firstName || '').toLowerCase().includes(term) ||
        (member?.lastName || '').toLowerCase().includes(term) ||
        (member?.email || '').toLowerCase().includes(term) ||
        (member?.phone || '').includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(member => member?.membership?.status === statusFilter);
    }

    // Membership type filter
    if (membershipTypeFilter !== 'all') {
      filtered = filtered.filter(member => member?.membership?.type === membershipTypeFilter);
    }

    // Tab filter
    switch (tabValue) {
      case 1: // Active
        filtered = filtered.filter(member => member?.membership?.status === 'Active');
        break;
      case 2: // Inactive
        filtered = filtered.filter(member => {
          const status = member?.membership?.status;
          return status === 'Paused' || status === 'Overdue' || status === 'No Membership' || !status;
        });
        break;
      // case 0 is 'All' - no additional filtering
    }

    setFilteredMembers(filtered);
  }, [memberList, searchTerm, statusFilter, membershipTypeFilter, tabValue]);

  const handleDeleteClick = (member: MemberRecord) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!memberToDelete || !userData) return;

    setDeleteLoading(memberToDelete.id);
    try {
      await deleteMember(memberToDelete.id, userData.uid);
      await fetchMembers();
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    } catch (err: any) {
      console.error('Error deleting member:', err);
      setError('An error occurred while deleting: ' + err.message);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setMemberToDelete(null);
  };

  const handleStatusClick = (member: MemberRecord, status: MemberStatus) => {
    setMemberToUpdate(member);
    setNewStatus(status);
    setStatusDialogOpen(true);
    handleMenuClose();
  };

  const handleStatusConfirm = async () => {
    if (!memberToUpdate || !userData) return;

    setStatusLoading(memberToUpdate.id);
    try {
      await updateMembershipStatus(memberToUpdate.id, newStatus, userData.uid);
      await fetchMembers();
      setStatusDialogOpen(false);
      setMemberToUpdate(null);
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError('An error occurred while updating status: ' + err.message);
    } finally {
      setStatusLoading(null);
    }
  };

  const handleStatusCancel = () => {
    setStatusDialogOpen(false);
    setMemberToUpdate(null);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, member: MemberRecord) => {
    setAnchorEl(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMember(null);
  };

  const getStatusColor = (status: MemberStatus) => {
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
  };

  const getStatusIcon = (status: MemberStatus) => {
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
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return format(dateObj, 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getMemberInitials = (member: MemberRecord) => {
    const firstName = member?.firstName || '';
    const lastName = member?.lastName || '';
    
    const firstInitial = firstName.length > 0 ? firstName.charAt(0).toUpperCase() : '';
    const lastInitial = lastName.length > 0 ? lastName.charAt(0).toUpperCase() : '';
    
    return `${firstInitial}${lastInitial}` || '??';
  };

  // Stats for tabs
  const memberStats = useMemo(() => {
    const stats = {
      all: memberList.length,
      active: memberList.filter(m => m?.membership?.status === 'Active').length,
      inactive: memberList.filter(m => {
        const status = m?.membership?.status;
        return status === 'Paused' || status === 'Overdue' || status === 'No Membership' || !status;
      }).length,
    };
    return stats;
  }, [memberList]);

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

  if (memberList.length === 0) {
    return (
      <Paper sx={{ p: 3, mt: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No members found. Create your first member to get started.
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
            placeholder="Search members..."
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
                <MenuItem value="Paused">Paused</MenuItem>
                <MenuItem value="Overdue">Overdue</MenuItem>
                <MenuItem value="No Membership">No Membership</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={membershipTypeFilter}
                label="Type"
                onChange={(e) => setMembershipTypeFilter(e.target.value as any)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="Recurring">Recurring</MenuItem>
                <MenuItem value="Prepaid">Prepaid</MenuItem>
              </Select>
            </FormControl>
          </Box>
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
                        {member?.firstName || 'Unknown'} {member?.lastName || 'Member'}
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
                      >
                        <MoreVertIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {member?.email || 'No email'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {member?.phone || 'No phone'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CreditCardIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {member?.membership?.type || 'No Membership'}
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
                    {member.tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))}
                  </Box>
                )}
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
          <Tab label={`All Members (${memberStats.all})`} />
          <Tab label={`Active (${memberStats.active})`} />
          <Tab label={`Inactive (${memberStats.inactive})`} />
        </Tabs>
        
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search members..."
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
              <MenuItem value="Paused">Paused</MenuItem>
              <MenuItem value="Overdue">Overdue</MenuItem>
              <MenuItem value="No Membership">No Membership</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={membershipTypeFilter}
              label="Type"
              onChange={(e) => setMembershipTypeFilter(e.target.value as any)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="Recurring">Recurring</MenuItem>
              <MenuItem value="Prepaid">Prepaid</MenuItem>
            </Select>
          </FormControl>

          <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
            Showing {filteredMembers.length} of {memberList.length} members
          </Typography>
        </Box>
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
            {filteredMembers.map((member) => (
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
                        {member?.firstName || 'Unknown'} {member?.lastName || 'Member'}
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
                      {member?.email || 'No email'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {member?.phone || 'No phone'}
                    </Typography>
                  </Box>
                </TableCell>
                
                <TableCell sx={{ fontSize: '0.9rem' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {member?.membership?.type || 'No Membership'}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Deactivate Member</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate <strong>{memberToDelete?.firstName} {memberToDelete?.lastName}</strong>?
            <br />This will mark the member as inactive but preserve their data.
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
            {deleteLoading ? 'Deactivating...' : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Change Confirmation Dialog */}
      <Dialog open={statusDialogOpen} onClose={handleStatusCancel}>
        <DialogTitle>Update Membership Status</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to change the membership status of{' '}
            <strong>{memberToUpdate?.firstName} {memberToUpdate?.lastName}</strong>{' '}
            to <strong>{newStatus}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleStatusCancel}>Cancel</Button>
          <Button 
            onClick={handleStatusConfirm} 
            color="primary" 
            variant="contained"
            disabled={statusLoading !== null}
          >
            {statusLoading ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MemberTable;