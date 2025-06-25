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
  Avatar,
  CardMedia,
  CardActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import GroupIcon from '@mui/icons-material/Group';
import { getAllClasses, deleteClass, ClassRecord } from '../services/classService';
import { format } from 'date-fns';

interface ClassTableProps {
  refreshTrigger?: number;
  onEdit: (classData: ClassRecord) => void;
  showAdminFeatures?: boolean;
}

const ClassTable: React.FC<ClassTableProps> = ({ refreshTrigger, onEdit, showAdminFeatures = false }) => {
  const [classList, setClassList] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classToDelete, setClassToDelete] = useState<ClassRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const list = await getAllClasses();
      setClassList(list);
      setError(null);
    } catch (err) {
      console.error('Error loading classes:', err);
      setError('An error occurred while loading classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [refreshTrigger]);

  const handleDeleteClick = (classItem: ClassRecord) => {
    setClassToDelete(classItem);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!classToDelete) return;

    setDeleteLoading(classToDelete.id);
    try {
      await deleteClass(classToDelete.id, classToDelete.imageUrl);
      await fetchClasses();
      setDeleteDialogOpen(false);
      setClassToDelete(null);
    } catch (err: any) {
      console.error('Error deleting class:', err);
      setError('An error occurred while deleting class: ' + err.message);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setClassToDelete(null);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'workshop':
        return 'secondary';
      case 'class':
        return 'primary';
      default:
        return 'default';
    }
  };

  const formatDateTime = (date: any) => {
    if (!date) return 'Invalid Date';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return format(dateObj, 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid Date';
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

  if (classList.length === 0) {
    return (
      <Paper sx={{ p: 3, mt: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No classes or workshops found.
        </Typography>
      </Paper>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          gap: 2,
          mt: 1 
        }}>
          {classList.map((classItem) => (
            <Card key={classItem.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {classItem.imageUrl && (
                <CardMedia
                  component="img"
                  height="200"
                  image={classItem.imageUrl}
                  alt={classItem.title}
                  sx={{ objectFit: 'cover' }}
                />
              )}
              <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6" component="div" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                    {classItem.title}
                  </Typography>
                  <Chip
                    label={classItem.type.charAt(0).toUpperCase() + classItem.type.slice(1)}
                    color={getTypeColor(classItem.type) as any}
                    size="small"
                  />
                </Box>
                
                {classItem.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {classItem.description.length > 100 
                      ? `${classItem.description.substring(0, 100)}...`
                      : classItem.description
                    }
                  </Typography>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EventIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {formatDateTime(classItem.date)} • {classItem.startTime} - {classItem.endTime}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {classItem.location}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {classItem.instructorName}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {classItem.currentEnrollment}/{classItem.capacity}
                      </Typography>
                    </Box>
                    
                    {classItem.price > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AttachMoneyIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        <Typography variant="body2" color="success.main" fontWeight={600}>
                          {classItem.price}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                {showAdminFeatures && (
                  <>
                    <IconButton
                      onClick={() => onEdit(classItem)}
                      size="small"
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDeleteClick(classItem)}
                      disabled={deleteLoading === classItem.id}
                      color="error"
                      size="small"
                    >
                      {deleteLoading === classItem.id ? (
                        <CircularProgress size={20} />
                      ) : (
                        <DeleteIcon />
                      )}
                    </IconButton>
                  </>
                )}
              </CardActions>
            </Card>
          ))}
        </Box>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
          <DialogTitle>Delete Class</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete <strong>{classToDelete?.title}</strong>?
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
                Class/Workshop
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Date & Time
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Location
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Instructor
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Capacity
              </TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                Price
              </TableCell>
              {showAdminFeatures && (
                <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem', width: 120 }}>
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {classList.map((classItem) => (
              <TableRow 
                key={classItem.id}
                sx={{ 
                  '&:hover': { 
                    backgroundColor: theme.palette.action.hover 
                  },
                  '&:last-child td, &:last-child th': { border: 0 }
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      src={classItem.imageUrl}
                      sx={{ width: 50, height: 50 }}
                      variant="rounded"
                    >
                      {classItem.title.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {classItem.title}
                      </Typography>
                      <Chip
                        label={classItem.type.charAt(0).toUpperCase() + classItem.type.slice(1)}
                        color={getTypeColor(classItem.type) as any}
                        size="small"
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: '0.9rem' }}>
                  <Typography variant="body2">
                    {formatDateTime(classItem.date)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {classItem.startTime} - {classItem.endTime}
                  </Typography>
                </TableCell>
                <TableCell sx={{ fontSize: '0.9rem' }}>
                  {classItem.location}
                </TableCell>
                <TableCell sx={{ fontSize: '0.9rem' }}>
                  {classItem.instructorName}
                </TableCell>
                <TableCell sx={{ fontSize: '0.9rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {classItem.currentEnrollment}/{classItem.capacity}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: '0.9rem' }}>
                  {classItem.price > 0 ? (
                    <Typography variant="body2" color="success.main" fontWeight={600}>
                      ${classItem.price}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Free
                    </Typography>
                  )}
                </TableCell>
                {showAdminFeatures && (
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        onClick={() => onEdit(classItem)}
                        size="small"
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteClick(classItem)}
                        disabled={deleteLoading === classItem.id}
                        color="error"
                        size="small"
                      >
                        {deleteLoading === classItem.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <DeleteIcon />
                        )}
                      </IconButton>
                    </Box>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Class</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{classToDelete?.title}</strong>?
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

export default ClassTable;