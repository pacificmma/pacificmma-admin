// src/components/PackageSessionManager.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  TextField,
  useTheme,
  useMediaQuery,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import EventIcon from '@mui/icons-material/Event';
import ScheduleIcon from '@mui/icons-material/Schedule';
import GroupIcon from '@mui/icons-material/Group';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays } from 'date-fns';
import { 
  PackageRecord, 
  ClassRecord, 
  updateClass, 
  deleteClass, 
  createClass,
  ClassData 
} from '../services/classService';

interface PackageSessionManagerProps {
  open: boolean;
  onClose: () => void;
  packageData: PackageRecord | null;
  onUpdate: () => void;
}

interface EditingSession {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
}

const PackageSessionManager: React.FC<PackageSessionManagerProps> = ({
  open,
  onClose,
  packageData,
  onUpdate
}) => {
  const [sessions, setSessions] = useState<ClassRecord[]>([]);
  const [editingSession, setEditingSession] = useState<EditingSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSessionData, setNewSessionData] = useState({
    date: new Date(),
    startTime: '',
    endTime: '',
    capacity: 10,
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (packageData && open) {
      setSessions(packageData.sessions || []);
      setNewSessionData({
        date: new Date(),
        startTime: packageData.startTime,
        endTime: packageData.endTime,
        capacity: packageData.capacity,
      });
    }
  }, [packageData, open]);

  const handleEditSession = (session: ClassRecord) => {
    setEditingSession({
      id: session.id,
      title: session.title,
      date: session.date.toDate(),
      startTime: session.startTime,
      endTime: session.endTime,
      capacity: session.capacity,
    });
  };

  const handleSaveSession = async () => {
    if (!editingSession || !packageData) return;

    setLoading(true);
    setError(null);

    try {
      const updateData: Partial<ClassData> = {
        title: editingSession.title,
        date: editingSession.date,
        startTime: editingSession.startTime,
        endTime: editingSession.endTime,
        capacity: editingSession.capacity,
      };

      await updateClass(editingSession.id, updateData);
      
      // Update local sessions
      setSessions(prev => prev.map(session => 
        session.id === editingSession.id 
          ? { ...session, ...updateData, date: { toDate: () => editingSession.date } as any }
          : session
      ));

      setEditingSession(null);
      onUpdate();
    } catch (err: any) {
      console.error('Error updating session:', err);
      setError('Failed to update session: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingSession(null);
    setError(null);
  };

  const handleDeleteSession = async (sessionId: string, imageUrl?: string) => {
    if (!packageData) return;

    setDeleteLoading(sessionId);
    setError(null);

    try {
      await deleteClass(sessionId, imageUrl);
      
      // Update local sessions
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      onUpdate();
    } catch (err: any) {
      console.error('Error deleting session:', err);
      setError('Failed to delete session: ' + err.message);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleAddSession = async () => {
    if (!packageData) return;

    setLoading(true);
    setError(null);

    try {
      const nextSessionNumber = Math.max(...sessions.map(s => s.sessionNumber || 0)) + 1;
      
      const classData: ClassData = {
        title: `${packageData.title} - Session ${nextSessionNumber}`,
        description: packageData.description,
        type: packageData.type,
        date: newSessionData.date,
        startTime: newSessionData.startTime,
        endTime: newSessionData.endTime,
        location: packageData.location,
        capacity: newSessionData.capacity,
        instructorId: packageData.instructorId,
        instructorName: packageData.instructorName,
        price: 0,
        isActive: true,
        // Package relation fields
        isPackage: true,
        packageId: packageData.id,
        packagePrice: packageData.packagePrice,
        totalSessions: packageData.totalSessions + 1,
        sessionNumber: nextSessionNumber,
        packageTitle: packageData.title,
      };

      const newSession = await createClass(classData, undefined);
      
      // Update local sessions
      setSessions(prev => [...prev, newSession as ClassRecord].sort((a, b) => 
        a.date.toDate().getTime() - b.date.toDate().getTime()
      ));

      setShowAddForm(false);
      setNewSessionData({
        date: addDays(newSessionData.date, 7), // Next week by default
        startTime: packageData.startTime,
        endTime: packageData.endTime,
        capacity: packageData.capacity,
      });
      
      onUpdate();
    } catch (err: any) {
      console.error('Error adding session:', err);
      setError('Failed to add session: ' + err.message);
    } finally {
      setLoading(false);
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

  const getSessionStatus = (session: ClassRecord) => {
    const sessionDate = session.date.toDate();
    const now = new Date();
    
    if (sessionDate < now) {
      return { label: 'Completed', color: 'success' as const };
    } else if (session.currentEnrollment >= session.capacity) {
      return { label: 'Full', color: 'error' as const };
    } else if (session.currentEnrollment > 0) {
      return { label: 'Active', color: 'primary' as const };
    } else {
      return { label: 'Open', color: 'default' as const };
    }
  };

  if (!packageData) return null;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="lg"
        fullScreen={isMobile}
        sx={{
          '& .MuiDialog-paper': {
            margin: isMobile ? 0 : 2,
            width: isMobile ? '100%' : 'auto',
            maxHeight: isMobile ? '100%' : 'calc(100% - 64px)',
          },
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}>
          <Box>
            <Typography variant="h6">
              Manage Package Sessions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {packageData.title} • {sessions.length} sessions
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Package Info */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              Package Information
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
              <Typography variant="body2">
                <strong>Instructor:</strong> {packageData.instructorName}
              </Typography>
              <Typography variant="body2">
                <strong>Location:</strong> {packageData.location}
              </Typography>
              <Typography variant="body2">
                <strong>Duration:</strong> {packageData.startTime} - {packageData.endTime}
              </Typography>
              <Typography variant="body2">
                <strong>Package Price:</strong> ${packageData.packagePrice}
              </Typography>
            </Box>
          </Box>

          {/* Add New Session */}
          <Accordion 
            expanded={showAddForm} 
            onChange={(_, expanded) => setShowAddForm(expanded)}
            sx={{ mb: 2 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AddIcon color="primary" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Add New Session
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
                gap: 2,
                mb: 2
              }}>
                <DatePicker
                  label="Date"
                  value={newSessionData.date}
                  onChange={(newValue) => newValue && setNewSessionData(prev => 
                    ({ ...prev, date: newValue })
                  )}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                    },
                  }}
                />
                
                <TimePicker
                  label="Start Time"
                  value={newSessionData.startTime ? new Date(`2000-01-01T${newSessionData.startTime}`) : null}
                  onChange={(newValue) => {
                    if (newValue) {
                      const timeString = newValue.toTimeString().slice(0, 5);
                      setNewSessionData(prev => ({ ...prev, startTime: timeString }));
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                    },
                  }}
                />

                <TimePicker
                  label="End Time"
                  value={newSessionData.endTime ? new Date(`2000-01-01T${newSessionData.endTime}`) : null}
                  onChange={(newValue) => {
                    if (newValue) {
                      const timeString = newValue.toTimeString().slice(0, 5);
                      setNewSessionData(prev => ({ ...prev, endTime: timeString }));
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                    },
                  }}
                />

                <TextField
                  label="Capacity"
                  type="number"
                  value={newSessionData.capacity}
                  onChange={(e) => setNewSessionData(prev => 
                    ({ ...prev, capacity: parseInt(e.target.value) || 0 })
                  )}
                  size="small"
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Box>
              
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddSession}
                disabled={loading || !newSessionData.startTime || !newSessionData.endTime}
                size="small"
              >
                {loading ? 'Adding...' : 'Add Session'}
              </Button>
            </AccordionDetails>
          </Accordion>

          {/* Sessions List */}
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Sessions ({sessions.length})
          </Typography>

          {sessions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No sessions found for this package.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {sessions
                .sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime())
                .map((session) => {
                  const isEditing = editingSession?.id === session.id;
                  const status = getSessionStatus(session);

                  return (
                    <Card key={session.id} variant="outlined">
                      <CardContent sx={{ p: 2 }}>
                        {isEditing ? (
                          // Edit Mode
                          <Box>
                            <Box sx={{ 
                              display: 'grid', 
                              gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' },
                              gap: 2,
                              mb: 2
                            }}>
                              <TextField
                                label="Session Title"
                                value={editingSession.title}
                                onChange={(e) => setEditingSession(prev => 
                                  prev ? { ...prev, title: e.target.value } : null
                                )}
                                size="small"
                                fullWidth
                              />
                              
                              <DatePicker
                                label="Date"
                                value={editingSession.date}
                                onChange={(newValue) => newValue && setEditingSession(prev => 
                                  prev ? { ...prev, date: newValue } : null
                                )}
                                slotProps={{
                                  textField: {
                                    fullWidth: true,
                                    size: "small",
                                  },
                                }}
                              />
                              
                              <TimePicker
                                label="Start Time"
                                value={editingSession.startTime ? new Date(`2000-01-01T${editingSession.startTime}`) : null}
                                onChange={(newValue) => {
                                  if (newValue && editingSession) {
                                    const timeString = newValue.toTimeString().slice(0, 5);
                                    setEditingSession(prev => 
                                      prev ? { ...prev, startTime: timeString } : null
                                    );
                                  }
                                }}
                                slotProps={{
                                  textField: {
                                    fullWidth: true,
                                    size: "small",
                                  },
                                }}
                              />

                              <TimePicker
                                label="End Time"
                                value={editingSession.endTime ? new Date(`2000-01-01T${editingSession.endTime}`) : null}
                                onChange={(newValue) => {
                                  if (newValue && editingSession) {
                                    const timeString = newValue.toTimeString().slice(0, 5);
                                    setEditingSession(prev => 
                                      prev ? { ...prev, endTime: timeString } : null
                                    );
                                  }
                                }}
                                slotProps={{
                                  textField: {
                                    fullWidth: true,
                                    size: "small",
                                  },
                                }}
                              />
                            </Box>

                            <TextField
                              label="Capacity"
                              type="number"
                              value={editingSession.capacity}
                              onChange={(e) => setEditingSession(prev => 
                                prev ? { ...prev, capacity: parseInt(e.target.value) || 0 } : null
                              )}
                              size="small"
                              sx={{ mb: 2, width: 150 }}
                              InputProps={{ inputProps: { min: session.currentEnrollment } }}
                              helperText={`Minimum: ${session.currentEnrollment} (current enrollment)`}
                            />

                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                variant="contained"
                                startIcon={<SaveIcon />}
                                onClick={handleSaveSession}
                                disabled={loading}
                                size="small"
                              >
                                Save
                              </Button>
                              <Button
                                variant="outlined"
                                startIcon={<CancelIcon />}
                                onClick={handleCancelEdit}
                                disabled={loading}
                                size="small"
                              >
                                Cancel
                              </Button>
                            </Box>
                          </Box>
                        ) : (
                          // View Mode
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                              <Box>
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {session.title}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <EventIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography variant="body2" color="text.secondary">
                                      {formatDateTime(session.date)}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography variant="body2" color="text.secondary">
                                      {session.startTime} - {session.endTime}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                    <Typography variant="body2" color="text.secondary">
                                      {session.currentEnrollment}/{session.capacity}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>
                              
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  label={status.label}
                                  color={status.color}
                                  size="small"
                                  variant="outlined"
                                />
                                <IconButton
                                  onClick={() => handleEditSession(session)}
                                  size="small"
                                  color="primary"
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  onClick={() => handleDeleteSession(session.id, session.imageUrl)}
                                  disabled={deleteLoading === session.id}
                                  size="small"
                                  color="error"
                                >
                                  {deleteLoading === session.id ? (
                                    <CircularProgress size={20} />
                                  ) : (
                                    <DeleteIcon />
                                  )}
                                </IconButton>
                              </Box>
                            </Box>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default PackageSessionManager;