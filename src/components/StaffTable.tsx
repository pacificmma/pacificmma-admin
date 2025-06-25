import React, { useEffect, useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { getAllStaff, setStaffActiveStatus } from '../services/staffService';
import Switch from '@mui/material/Switch';

interface Staff {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'trainer' | 'staff';
  uid: string;
  isActive: boolean;
}

interface StaffTableProps {
  refreshTrigger?: number;
}

const StaffTable = ({ refreshTrigger }: StaffTableProps) => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [staffToToggle, setStaffToToggle] = useState<Staff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const list = await getAllStaff();
      setStaffList(list);
      setError(null);
    } catch (err) {
      console.error('Error loading staff:', err);
      setError('An error occurred while loading staff list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [refreshTrigger]);

  const handleToggleClick = (staff: Staff) => {
    // Kendi hesabını deaktif etmesini engelle
    if (staff.id === user?.uid) {
      setError('You cannot deactivate your own account');
      return;
    }
    
    setStaffToToggle(staff);
    setConfirmDialogOpen(true);
  };

  const handleToggleConfirm = async () => {
    if (!staffToToggle) return;

    setToggleLoading(staffToToggle.id);
    try {
      await setStaffActiveStatus(staffToToggle.id, !staffToToggle.isActive, user?.uid || '');
      await fetchStaff();
      setConfirmDialogOpen(false);
      setStaffToToggle(null);
      setError(null);
    } catch (err: any) {
      console.error('Error changing staff status:', err);
      setError(err.message || 'An error occurred while changing user status');
    } finally {
      setToggleLoading(null);
    }
  };

  const handleToggleCancel = () => {
    setConfirmDialogOpen(false);
    setStaffToToggle(null);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'trainer':
        return 'primary';
      case 'staff':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusChip = (staff: Staff) => {
    return (
      <Chip
        label={staff.isActive ? 'Active' : 'Inactive'}
        color={staff.isActive ? 'success' : 'default'}
        size="small"
        variant="outlined"
      />
    );
  };

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

  if (staffList.length === 0) {
    return (
      <Paper sx={{ p: 3, mt: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No staff members found.
        </Typography>
      </Paper>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <>
        <Box sx={{ mt: 2 }}>
          {staffList.map((staff) => (
            <Card key={staff.id} sx={{ mb: 2, elevation: 1, opacity: staff.isActive ? 1 : 0.6 }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" component="div" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                      {staff.fullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word', mb: 1 }}>
                      {staff.email}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                        color={getRoleColor(staff.role) as any}
                        size="small"
                      />
                      {getStatusChip(staff)}
                    </Box>
                  </Box>
                  <Box sx={{ ml: 1, display: 'flex', alignItems: 'center' }}>
                    <Switch
                      checked={staff.isActive}
                      onChange={() => handleToggleClick(staff)}
                      disabled={toggleLoading === staff.id || staff.id === user?.uid}
                      color="success"
                      inputProps={{
                        'aria-label': staff.isActive ? 'Deactivate user' : 'Activate user',
                      }}
                    />
                    {toggleLoading === staff.id && <CircularProgress size={20} sx={{ ml: 1 }} />}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Status Toggle Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onClose={handleToggleCancel}>
          <DialogTitle>
            {staffToToggle?.isActive ? 'Deactivate User' : 'Activate User'}
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to {staffToToggle?.isActive ? 'deactivate' : 'activate'} <strong>{staffToToggle?.fullName}</strong>?
              {staffToToggle?.isActive 
                ? ' This will prevent them from logging into the system, but their data will be preserved and can be reactivated later.'
                : ' This will allow them to log into the system again.'
              }
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleToggleCancel}>Cancel</Button>
            <Button
              onClick={handleToggleConfirm}
              color={staffToToggle?.isActive ? 'warning' : 'success'}
              variant="contained"
              disabled={toggleLoading !== null}
            >
              {toggleLoading ? 
                (staffToToggle?.isActive ? 'Deactivating...' : 'Activating...') : 
                (staffToToggle?.isActive ? 'Deactivate' : 'Activate')
              }
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  // Desktop table view
  return (
    <>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Full Name
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Email
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Role
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Status
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem', width: 120 }}>
                Active
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {staffList.map((staff) => (
              <TableRow
                key={staff.id}
                sx={{
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover
                  },
                  '&:last-child td, &:last-child th': { border: 0 },
                  opacity: staff.isActive ? 1 : 0.6
                }}
              >
                <TableCell sx={{ fontSize: '0.9rem' }}>
                  {staff.fullName}
                </TableCell>
                <TableCell sx={{ fontSize: '0.9rem', wordBreak: 'break-word' }}>
                  {staff.email}
                </TableCell>
                <TableCell>
                  <Chip
                    label={staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                    color={getRoleColor(staff.role) as any}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {getStatusChip(staff)}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Switch
                      checked={staff.isActive}
                      onChange={() => handleToggleClick(staff)}
                      disabled={toggleLoading === staff.id || staff.id === user?.uid}
                      color="success"
                      inputProps={{
                        'aria-label': staff.isActive ? 'Deactivate user' : 'Activate user',
                      }}
                    />
                    {toggleLoading === staff.id && <CircularProgress size={20} sx={{ ml: 1 }} />}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Status Toggle Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={handleToggleCancel}>
        <DialogTitle>
          {staffToToggle?.isActive ? 'Deactivate User' : 'Activate User'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {staffToToggle?.isActive ? 'deactivate' : 'activate'} <strong>{staffToToggle?.fullName}</strong>?
            {staffToToggle?.isActive 
              ? ' This will prevent them from logging into the system, but their data will be preserved and can be reactivated later.'
              : ' This will allow them to log into the system again.'
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleToggleCancel}>Cancel</Button>
          <Button
            onClick={handleToggleConfirm}
            color={staffToToggle?.isActive ? 'warning' : 'success'}
            variant="contained"
            disabled={toggleLoading !== null}
          >
            {toggleLoading ? 
              (staffToToggle?.isActive ? 'Deactivating...' : 'Activating...') : 
              (staffToToggle?.isActive ? 'Deactivate' : 'Activate')
            }
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default StaffTable;