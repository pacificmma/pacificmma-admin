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
  CardMedia,
  CardActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import GroupIcon from '@mui/icons-material/Group';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PackageIcon from '@mui/icons-material/Inventory';
import { getAllClasses, getAllPackages, deleteClass, deletePackage, ClassRecord, PackageRecord } from '../services/classService';
import { format } from 'date-fns';
import { useRoleControl } from '../hooks/useRoleControl';

interface ClassTableProps {
  refreshTrigger?: number;
  onEdit: (classData: ClassRecord) => void;
  filter: 'all' | 'class' | 'workshop';
}

const ClassTable: React.FC<ClassTableProps> = ({ refreshTrigger, onEdit, filter }) => {
  const [classList, setClassList] = useState<ClassRecord[]>([]);
  const [packageList, setPackageList] = useState<PackageRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'class' | 'package', item: ClassRecord | PackageRecord} | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAdmin } = useRoleControl();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classes, packages] = await Promise.all([
        getAllClasses(),
        getAllPackages()
      ]);
      setClassList(classes);
      setPackageList(packages);
      setError(null);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('An error occurred while loading classes and packages');
    } finally {
      setLoading(false);
    }
  };

  // Filter and combine data
  const filteredData = useMemo(() => {
    const singleClasses = classList.filter(classItem => !classItem.isPackage);
    
    let filteredClasses = singleClasses;
    let filteredPackages = packageList;

    if (filter !== 'all') {
      filteredClasses = singleClasses.filter(classItem => classItem.type === filter);
      filteredPackages = packageList.filter(pkg => pkg.type === filter);
    }

    // Combine and sort by date
    const combined = [
      ...filteredClasses.map(item => ({ type: 'class' as const, item })),
      ...filteredPackages.map(item => ({ type: 'package' as const, item }))
    ];

    return combined.sort((a, b) => {
      const dateA = a.type === 'class' ? a.item.date.toDate() : a.item.startDate.toDate();
      const dateB = b.type === 'class' ? b.item.date.toDate() : b.item.startDate.toDate();
      return dateA.getTime() - dateB.getTime();
    });
  }, [classList, packageList, filter]);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const handleDeleteClick = (type: 'class' | 'package', item: ClassRecord | PackageRecord) => {
    setItemToDelete({ type, item });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    setDeleteLoading(itemToDelete.item.id);
    try {
      if (itemToDelete.type === 'class') {
        const classItem = itemToDelete.item as ClassRecord;
        await deleteClass(classItem.id, classItem.imageUrl);
      } else {
        const packageItem = itemToDelete.item as PackageRecord;
        await deletePackage(packageItem.id, packageItem.imageUrl);
      }
      
      await fetchData();
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (err: any) {
      console.error('Error deleting item:', err);
      setError('An error occurred while deleting: ' + err.message);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
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

  if (filteredData.length === 0) {
    const getEmptyMessage = () => {
      switch (filter) {
        case 'class':
          return 'No regular classes found.';
        case 'workshop':
          return 'No workshops found.';
        default:
          return 'No classes or workshops found.';
      }
    };

    return (
      <Paper sx={{ p: 3, mt: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          {getEmptyMessage()}
        </Typography>
      </Paper>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: 2,
          mt: 1 
        }}>
          {filteredData.map(({ type, item }) => (
            <Card key={`${type}-${item.id}`} sx={{ elevation: 1 }}>
              {type === 'package' ? (
                // Package Card
                <Box>
                  {item.imageUrl && (
                    <CardMedia
                      component="img"
                      height="180"
                      image={item.imageUrl}
                      alt={item.title}
                      sx={{ objectFit: 'cover' }}
                    />
                  )}
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" component="div" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        {item.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Chip
                          icon={<PackageIcon />}
                          label="Package"
                          color="warning"
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                          color={getTypeColor(item.type) as any}
                          size="small"
                        />
                      </Box>
                    </Box>
                    
                    {item.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {item.description.length > 100 
                          ? `${item.description.substring(0, 100)}...`
                          : item.description
                        }
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EventIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {formatDateTime(item.startDate)} - {formatDateTime(item.endDate)}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {item.location}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {item.instructorName}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {item.totalSessions} sessions • {item.startTime} - {item.endTime}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AttachMoneyIcon sx={{ fontSize: 16, color: 'success.main' }} />
                          <Typography variant="body2" color="success.main" fontWeight={600}>
                            {item.packagePrice}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Package Sessions Accordion */}
                    <Accordion sx={{ mt: 2 }} elevation={0}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="body2" fontWeight={600}>
                          View Sessions ({item.sessions?.length || 0})
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0 }}>
                        {item.sessions?.map((session, index) => (
                          <Box key={session.id} sx={{ py: 1, borderBottom: index < item.sessions.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                            <Typography variant="body2" fontWeight={500}>
                              Session {session.sessionNumber}: {formatDateTime(session.date)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {session.currentEnrollment}/{session.capacity} enrolled
                            </Typography>
                          </Box>
                        ))}
                      </AccordionDetails>
                    </Accordion>
                  </CardContent>
                </Box>
              ) : (
                // Single Class Card
                <Box>
                  {item.imageUrl && (
                    <CardMedia
                      component="img"
                      height="200"
                      image={item.imageUrl}
                      alt={item.title}
                      sx={{ objectFit: 'cover' }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" component="div" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        {item.title}
                      </Typography>
                      <Chip
                        label={item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                        color={getTypeColor(item.type) as any}
                        size="small"
                      />
                    </Box>
                    
                    {item.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {item.description.length > 100 
                          ? `${item.description.substring(0, 100)}...`
                          : item.description
                        }
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EventIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {formatDateTime(item.date)} • {item.startTime} - {item.endTime}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {item.location}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {item.instructorName}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {item.currentEnrollment}/{item.capacity}
                          </Typography>
                        </Box>
                        
                        {item.price > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AttachMoneyIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            <Typography variant="body2" color="success.main" fontWeight={600}>
                              {item.price}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Box>
              )}
              
              {/* Admin Actions */}
              {isAdmin && (
                <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                  {type === 'class' && (
                    <IconButton
                      onClick={() => onEdit(item as ClassRecord)}
                      size="small"
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                  <IconButton
                    onClick={() => handleDeleteClick(type, item)}
                    disabled={deleteLoading === item.id}
                    color="error"
                    size="small"
                  >
                    {deleteLoading === item.id ? (
                      <CircularProgress size={20} />
                    ) : (
                      <DeleteIcon />
                    )}
                  </IconButton>
                </CardActions>
              )}
            </Card>
          ))}
        </Box>

        {/* Delete Confirmation Dialog */}
        {isAdmin && (
          <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
            <DialogTitle>
              Delete {itemToDelete?.type === 'package' ? 'Package' : 'Class'}
            </DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete <strong>{itemToDelete?.item.title}</strong>?
                {itemToDelete?.type === 'package' && (
                  <><br/>This will also delete all {(itemToDelete.item as PackageRecord).totalSessions} sessions in this package.</>
                )}
                <br/>This action cannot be undone.
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
        )}
      </>
    );
  }

  // Desktop table view - Similar structure but in table format
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
              {isAdmin && (
                <TableCell sx={{ fontWeight: 600, fontSize: '0.95rem', width: 120 }}>
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map(({ type, item }) => (
              <TableRow 
                key={`${type}-${item.id}`}
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
                      src={item.imageUrl}
                      sx={{ width: 50, height: 50 }}
                      variant="rounded"
                    >
                      {item.title.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {item.title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                        {type === 'package' && (
                          <Chip
                            icon={<PackageIcon />}
                            label="Package"
                            color="warning"
                            size="small"
                            variant="outlined"
                          />
                        )}
                        <Chip
                          label={item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                          color={getTypeColor(item.type) as any}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: '0.9rem' }}>
                  {type === 'package' ? (
                    <Box>
                      <Typography variant="body2">
                        {formatDateTime(item.startDate)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        to {formatDateTime((item as PackageRecord).endDate)}
                      </Typography>
                      <Typography variant="caption" color="primary.main">
                        {item.totalSessions} sessions
                      </Typography>
                    </Box>
                  ) : (
                    <Box>
                      <Typography variant="body2">
                        {formatDateTime(item.date)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.startTime} - {item.endTime}
                      </Typography>
                    </Box>
                  )}
                </TableCell>
                <TableCell sx={{ fontSize: '0.9rem' }}>
                  {item.location}
                </TableCell>
                <TableCell sx={{ fontSize: '0.9rem' }}>
                  {item.instructorName}
                </TableCell>
                <TableCell sx={{ fontSize: '0.9rem' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="body2">
                      {type === 'package' 
                        ? `${item.capacity} per session`
                        : `${item.currentEnrollment}/${item.capacity}`
                      }
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ fontSize: '0.9rem' }}>
                  {type === 'package' ? (
                    <Box>
                      <Typography variant="body2" color="success.main" fontWeight={600}>
                        ${(item as PackageRecord).packagePrice} package
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ${((item as PackageRecord).packagePrice / item.totalSessions).toFixed(2)} per session
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="success.main" fontWeight={600}>
                      {item.price > 0 ? `$${item.price}` : 'Free'}
                    </Typography>
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {type === 'class' && (
                        <IconButton
                          onClick={() => onEdit(item as ClassRecord)}
                          size="small"
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      )}
                      <IconButton
                        onClick={() => handleDeleteClick(type, item)}
                        disabled={deleteLoading === item.id}
                        color="error"
                        size="small"
                      >
                        {deleteLoading === item.id ? (
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
      {isAdmin && (
        <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
          <DialogTitle>
            Delete {itemToDelete?.type === 'package' ? 'Package' : 'Class'}
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete <strong>{itemToDelete?.item.title}</strong>?
              {itemToDelete?.type === 'package' && (
                <><br/>This will also delete all {(itemToDelete.item as PackageRecord).totalSessions} sessions in this package.</>
              )}
              <br/>This action cannot be undone.
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
      )}
    </>
  );
};

export default ClassTable;