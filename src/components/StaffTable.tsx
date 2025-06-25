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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { getAllStaff, deleteStaff } from '../services/staffService';

interface Staff {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'trainer' | 'staff';
  uid: string;
}

interface StaffTableProps {
  refreshTrigger?: number;
}

const StaffTable: React.FC<StaffTableProps> = ({ refreshTrigger }) => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [error, setError] = useState<string | null>(null);
  
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

  const handleDeleteClick = (staff: Staff) => {
    setStaffToDelete(staff);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!staffToDelete) return;

    setDeleteLoading(staffToDelete.id);
    try {
      await deleteStaff(staffToDelete.id, staffToDelete.email, '');
      await fetchStaff();
      setDeleteDialogOpen(false);
      setStaffToDelete(null);
    } catch (err: any) {
      console.error('Error deleting staff:', err);
      setError('An error occurred while deleting user: ' + err.message);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setStaffToDelete(null);
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
        <Alert severity="error">{error}</Alert>
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
            <Card key={staff.id} sx={{ mb: 2, elevation: 1 }}>
              <CardContent sx={{ pb: '16px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" component="div" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                      {staff.fullName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word', mb: 1 }}>
                      {staff.email}
                    </Typography>
                    <Chip
                      label={staff.role.charAt(0).toUpperCase() + staff.role.slice(1)}
                      color={getRoleColor(staff.role) as any}
                      size="small"
                    />
                  </Box>
                  <IconButton
                    onClick={() => handleDeleteClick(staff)}
                    disabled={deleteLoading === staff.id}
                    color="error"
                    size="small"
                    sx={{ ml: 1 }}
                  >
                    {deleteLoading === staff.id ? (
                      <CircularProgress size={20} />
                    ) : (
                      <DeleteIcon />
                    )}
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
          <DialogTitle>Delete User</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete <strong>{staffToDelete?.fullName}</strong>?
              This action cannot be undone.
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
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem', width: 80 }}>
                Actions
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
                  '&:last-child td, &:last-child th': { border: 0 }
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
                  <IconButton
                    onClick={() => handleDeleteClick(staff)}
                    disabled={deleteLoading === staff.id}
                    color="error"
                    size="small"
                  >
                    {deleteLoading === staff.id ? (
                      <CircularProgress size={20} />
                    ) : (
                      <DeleteIcon />
                    )}
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{staffToDelete?.fullName}</strong>?
            This action cannot be undone.
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
    </>
  );
};

export default StaffTable;