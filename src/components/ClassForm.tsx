import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Box,
  useMediaQuery,
  useTheme,
  IconButton,
  Alert,
  InputAdornment,
  Typography,
  FormControl,
  InputLabel,
  Select,
  Avatar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { createClass, updateClass, getInstructors, ClassData } from '../services/classService';

interface ClassFormProps {
  open: boolean;
  onClose: () => void;
  editData?: any;
}

const classTypes = [
  { value: 'class', label: 'Regular Class' },
  { value: 'workshop', label: 'Workshop' },
];

const ClassForm: React.FC<ClassFormProps> = ({ open, onClose, editData }) => {
  const [formData, setFormData] = useState<ClassData>({
    title: '',
    description: '',
    type: 'class',
    date: new Date(),
    startTime: '',
    endTime: '',
    location: '',
    capacity: 10,
    instructorId: '',
    instructorName: '',
    price: 0,
    isActive: true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [instructors, setInstructors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (open) {
      loadInstructors();
      if (editData) {
        setFormData({
          ...editData,
          date: editData.date.toDate(),
        });
        setImagePreview(editData.imageUrl || '');
      }
    }
  }, [open, editData]);

  const loadInstructors = async () => {
    try {
      const instructorList = await getInstructors();
      setInstructors(instructorList);
    } catch (error) {
      console.error('Error loading instructors:', error);
    }
  };

  const handleInputChange = (field: keyof ClassData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Update instructor name when instructor is selected
    if (field === 'instructorId') {
      const selectedInstructor = instructors.find(inst => inst.id === value);
      setFormData(prev => ({ 
        ...prev, 
        instructorId: value,
        instructorName: selectedInstructor?.name || ''
      }));
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim() || !formData.location.trim() || !formData.instructorId) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      setError('Please set start and end times');
      return;
    }

    if (formData.capacity <= 0) {
      setError('Capacity must be greater than 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editData) {
        await updateClass(editData.id, formData, imageFile || undefined);
      } else {
        await createClass(formData, imageFile || undefined);
      }
      
      handleClose();
    } catch (err: any) {
      console.error('Error saving class:', err);
      setError('An error occurred while saving the class');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setFormData({
      title: '',
      description: '',
      type: 'class',
      date: new Date(),
      startTime: '',
      endTime: '',
      location: '',
      capacity: 10,
      instructorId: '',
      instructorName: '',
      price: 0,
      isActive: true,
    });
    setImageFile(null);
    setImagePreview('');
    setError(null);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog 
        open={open} 
        onClose={handleClose}
        fullWidth 
        maxWidth="md"
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
          fontSize: { xs: '1.1rem', sm: '1.25rem' }
        }}>
          {editData ? 'Edit Class/Workshop' : 'Add New Class/Workshop'}
          {isMobile && (
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 3,
            mt: 0.5 
          }}>
            {/* Image Upload */}
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={imagePreview}
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    bgcolor: 'grey.200',
                    border: '2px dashed',
                    borderColor: 'grey.300'
                  }}
                >
                  <PhotoCameraIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Class Image
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    size="small"
                    startIcon={<PhotoCameraIcon />}
                  >
                    Upload Image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </Button>
                </Box>
              </Box>
            </Box>

            {/* Title */}
            <Box>
              <TextField
                label="Title *"
                fullWidth
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                variant="outlined"
                size={isMobile ? "small" : "medium"}
              />
            </Box>

            {/* Type */}
            <Box>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel>Type *</InputLabel>
                <Select
                  value={formData.type}
                  label="Type *"
                  onChange={(e) => handleInputChange('type', e.target.value)}
                >
                  {classTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Description */}
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                variant="outlined"
                size={isMobile ? "small" : "medium"}
              />
            </Box>

            {/* Date */}
            <Box>
              <DatePicker
                label="Date *"
                value={formData.date}
                onChange={(newValue) => newValue && handleInputChange('date', newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: isMobile ? "small" : "medium",
                  },
                }}
              />
            </Box>

            {/* Start Time */}
            <Box>
              <TimePicker
                label="Start Time *"
                value={formData.startTime ? new Date(`2000-01-01T${formData.startTime}`) : null}
                onChange={(newValue) => {
                  if (newValue) {
                    const timeString = newValue.toTimeString().slice(0, 5);
                    handleInputChange('startTime', timeString);
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: isMobile ? "small" : "medium",
                  },
                }}
              />
            </Box>

            {/* End Time */}
            <Box>
              <TimePicker
                label="End Time *"
                value={formData.endTime ? new Date(`2000-01-01T${formData.endTime}`) : null}
                onChange={(newValue) => {
                  if (newValue) {
                    const timeString = newValue.toTimeString().slice(0, 5);
                    handleInputChange('endTime', timeString);
                  }
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: isMobile ? "small" : "medium",
                  },
                }}
              />
            </Box>

            {/* Location */}
            <Box>
              <TextField
                label="Location *"
                fullWidth
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                variant="outlined"
                size={isMobile ? "small" : "medium"}
              />
            </Box>

            {/* Instructor */}
            <Box>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel>Instructor *</InputLabel>
                <Select
                  value={formData.instructorId}
                  label="Instructor *"
                  onChange={(e) => handleInputChange('instructorId', e.target.value)}
                >
                  {instructors.map((instructor) => (
                    <MenuItem key={instructor.id} value={instructor.id}>
                      {instructor.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Capacity */}
            <Box>
              <TextField
                label="Capacity *"
                type="number"
                fullWidth
                value={formData.capacity}
                onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 0)}
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                InputProps={{
                  inputProps: { min: 1 }
                }}
              />
            </Box>

            {/* Price */}
            <Box>
              <TextField
                label="Price"
                type="number"
                fullWidth
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ 
          px: { xs: 2, sm: 3 }, 
          pb: { xs: 2, sm: 3 },
          pt: 1,
          gap: 1,
          flexDirection: { xs: 'column', sm: 'row' },
          '& .MuiButton-root': {
            width: { xs: '100%', sm: 'auto' },
            minWidth: { sm: 80 }
          }
        }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            variant="outlined"
            size={isMobile ? "medium" : "medium"}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={loading}
            size={isMobile ? "medium" : "medium"}
          >
            {loading ? (editData ? 'Updating...' : 'Creating...') : (editData ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default ClassForm;