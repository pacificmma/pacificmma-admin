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
  LinearProgress,
  Chip,
  Tooltip,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Radio,
  RadioGroup,
  FormLabel,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CompressIcon from '@mui/icons-material/Compress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RepeatIcon from '@mui/icons-material/Repeat';
import EventIcon from '@mui/icons-material/Event';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { createClass, updateClass, getInstructors, ClassData } from '../services/classService';
import { addDays, format, addWeeks, addMonths } from 'date-fns';
import {
  optimizeImage,
  validateImageFile,
  formatFileSize,
  DEFAULT_CLASS_IMAGE_OPTIONS,
  OptimizedImageResult
} from '../utils/imageUtils';

interface ClassFormProps {
  open: boolean;
  onClose: () => void;
  editData?: any;
}

interface ScheduleSettings {
  scheduleType: 'single' | 'recurring';
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, etc.
  duration: {
    value: number;
    unit: 'weeks' | 'months';
  };
  startDate: Date;
  endDate?: Date;
}

const classTypes = [
  { value: 'class', label: 'Regular Class' },
  { value: 'workshop', label: 'Workshop' },
];

const weekDays = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
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

  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>({
    scheduleType: 'single',
    daysOfWeek: [],
    duration: {
      value: 4,
      unit: 'weeks'
    },
    startDate: new Date(),
  });

  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [optimizedImage, setOptimizedImage] = useState<OptimizedImageResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageProcessing, setImageProcessing] = useState(false);
  const [instructors, setInstructors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

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
        setScheduleSettings({
          ...scheduleSettings,
          scheduleType: 'single',
          startDate: editData.date.toDate(),
        });
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

    if (field === 'instructorId') {
      const selectedInstructor = instructors.find(inst => inst.id === value);
      setFormData(prev => ({
        ...prev,
        instructorId: value,
        instructorName: selectedInstructor?.name || ''
      }));
    }
  };

  const handleScheduleChange = (field: keyof ScheduleSettings, value: any) => {
    setScheduleSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleDayToggle = (day: number) => {
    setScheduleSettings(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }));
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageError(null);
    setImageProcessing(true);

    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        setImageError(validation.error || 'Invalid file');
        setImageProcessing(false);
        return;
      }

      setOriginalImageFile(file);

      // Optimize image
      const optimized = await optimizeImage(file, DEFAULT_CLASS_IMAGE_OPTIONS);
      setOptimizedImage(optimized);
      setImagePreview(optimized.preview);

      console.log('Image optimization complete:', {
        original: formatFileSize(optimized.originalSize),
        optimized: formatFileSize(optimized.optimizedSize),
        compression: `${Math.round((1 - optimized.compressionRatio) * 100)}%`
      });

    } catch (error: any) {
      console.error('Image optimization error:', error);
      setImageError(error.message || 'Failed to process image');
    } finally {
      setImageProcessing(false);
    }
  };

  const calculateEndDate = () => {
    const { startDate, duration } = scheduleSettings;
    if (duration.unit === 'weeks') {
      return addWeeks(startDate, duration.value);
    } else {
      return addMonths(startDate, duration.value);
    }
  };

  const generateClassSchedule = () => {
    if (scheduleSettings.scheduleType === 'single') {
      return [{ ...formData, date: scheduleSettings.startDate }];
    }

    const classes = [];
    const endDate = calculateEndDate();
    let currentDate = new Date(scheduleSettings.startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      if (scheduleSettings.daysOfWeek.includes(dayOfWeek)) {
        classes.push({
          ...formData,
          date: new Date(currentDate),
          title: `${formData.title} - ${format(currentDate, 'MMM dd')}`
        });
      }
      
      currentDate = addDays(currentDate, 1);
    }

    return classes;
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

    if (scheduleSettings.scheduleType === 'recurring' && scheduleSettings.daysOfWeek.length === 0) {
      setError('Please select at least one day for recurring classes');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const imageFile = optimizedImage?.file || undefined;

      if (editData) {
        // Edit existing class
        await updateClass(editData.id, formData, imageFile);
      } else {
        // Create new class(es)
        const classesToCreate = generateClassSchedule();
        
        for (const classData of classesToCreate) {
          await createClass(classData, imageFile);
        }
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
    setScheduleSettings({
      scheduleType: 'single',
      daysOfWeek: [],
      duration: {
        value: 4,
        unit: 'weeks'
      },
      startDate: new Date(),
    });
    setOriginalImageFile(null);
    setOptimizedImage(null);
    setImagePreview('');
    setError(null);
    setImageError(null);
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
          {editData ? 'Edit Class/Workshop' : 'Create New Class/Workshop'}
          {isMobile && (
            <IconButton onClick={handleClose} size="small" disabled={loading}>
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
            {/* Enhanced Image Upload Section */}
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Class Image (Optional)
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Avatar
                  src={imagePreview}
                  sx={{
                    width: 100,
                    height: 100,
                    bgcolor: 'grey.200',
                    border: '2px dashed',
                    borderColor: imageError ? 'error.main' : 'grey.300'
                  }}
                >
                  <PhotoCameraIcon />
                </Avatar>

                <Box sx={{ flex: 1 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    size="small"
                    startIcon={imageProcessing ? <CompressIcon /> : <PhotoCameraIcon />}
                    disabled={imageProcessing || loading}
                    sx={{ mb: 1 }}
                  >
                    {imageProcessing ? 'Processing...' : 'Upload Image'}
                    <input
                      type="file"
                      hidden
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageChange}
                    />
                  </Button>

                  {imageProcessing && (
                    <Box sx={{ mb: 1 }}>
                      <LinearProgress variant="indeterminate" />
                      <Typography variant="caption" color="text.secondary">
                        Optimizing image...
                      </Typography>
                    </Box>
                  )}

                  {optimizedImage && (
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Optimized"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                        <Tooltip title={`Compressed from ${formatFileSize(optimizedImage.originalSize)} to ${formatFileSize(optimizedImage.optimizedSize)}`}>
                          <Chip
                            icon={<CompressIcon />}
                            label={`-${Math.round((1 - optimizedImage.compressionRatio) * 100)}%`}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        </Tooltip>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Final size: {formatFileSize(optimizedImage.optimizedSize)}
                      </Typography>
                    </Box>
                  )}

                  {imageError && (
                    <Alert severity="error" icon={<WarningIcon />} sx={{ mt: 1 }}>
                      <Typography variant="caption">
                        {imageError}
                      </Typography>
                    </Alert>
                  )}

                  <Typography variant="caption" color="text.secondary" display="block">
                    Recommended: JPG/PNG under 2MB
                    <br />
                    Will be optimized to max 500KB
                  </Typography>
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
          </Box>

          {/* Schedule Settings */}
          <Paper sx={{ mt: 3, p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <EventIcon />
              Schedule Settings
            </Typography>

            {/* Schedule Type Selection - Only for new classes */}
            {!editData && (
              <FormControl component="fieldset" sx={{ mb: 3 }}>
                <FormLabel component="legend">Schedule Type</FormLabel>
                <RadioGroup
                  value={scheduleSettings.scheduleType}
                  onChange={(e) => handleScheduleChange('scheduleType', e.target.value)}
                  row
                >
                  <FormControlLabel 
                    value="single" 
                    control={<Radio />} 
                    label="Single Class" 
                  />
                  <FormControlLabel 
                    value="recurring" 
                    control={<Radio />} 
                    label="Recurring Classes" 
                  />
                </RadioGroup>
              </FormControl>
            )}

            {/* Single Class Date or Recurring Settings */}
            {scheduleSettings.scheduleType === 'single' ? (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, 
                gap: 2, 
                mb: 2 
              }}>
                <DatePicker
                  label="Date *"
                  value={scheduleSettings.startDate}
                  onChange={(newValue) => newValue && handleScheduleChange('startDate', newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: isMobile ? "small" : "medium",
                    },
                  }}
                />
                
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
            ) : (
              <Box>
                {/* Days of Week Selection */}
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Select Days of Week
                </Typography>
                <FormGroup sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {weekDays.map((day) => (
                      <FormControlLabel
                        key={day.value}
                        control={
                          <Checkbox
                            checked={scheduleSettings.daysOfWeek.includes(day.value)}
                            onChange={() => handleDayToggle(day.value)}
                          />
                        }
                        label={day.label}
                      />
                    ))}
                  </Box>
                </FormGroup>

                {/* Duration and Time Settings */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(5, 1fr)' }, 
                  gap: 2, 
                  mb: 2 
                }}>
                  <DatePicker
                    label="Start Date *"
                    value={scheduleSettings.startDate}
                    onChange={(newValue) => newValue && handleScheduleChange('startDate', newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        size: isMobile ? "small" : "medium",
                      },
                    }}
                  />
                  
                  <TextField
                    label="Duration *"
                    type="number"
                    value={scheduleSettings.duration.value}
                    onChange={(e) => handleScheduleChange('duration', {
                      ...scheduleSettings.duration,
                      value: parseInt(e.target.value) || 1
                    })}
                    InputProps={{ inputProps: { min: 1, max: 52 } }}
                    size={isMobile ? "small" : "medium"}
                  />
                  
                  <FormControl size={isMobile ? "small" : "medium"}>
                    <InputLabel>Unit</InputLabel>
                    <Select
                      value={scheduleSettings.duration.unit}
                      label="Unit"
                      onChange={(e) => handleScheduleChange('duration', {
                        ...scheduleSettings.duration,
                        unit: e.target.value as 'weeks' | 'months'
                      })}
                    >
                      <MenuItem value="weeks">Weeks</MenuItem>
                      <MenuItem value="months">Months</MenuItem>
                    </Select>
                  </FormControl>

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

                {/* Schedule Preview */}
                {scheduleSettings.daysOfWeek.length > 0 && formData.startTime && formData.endTime && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Schedule Preview:</strong><br />
                      Classes will run from <strong>{format(scheduleSettings.startDate, 'MMM dd, yyyy')}</strong> to <strong>{format(calculateEndDate(), 'MMM dd, yyyy')}</strong><br />
                      Total classes to be created: <strong>{generateClassSchedule().length}</strong><br />
                      Time: <strong>{formData.startTime} - {formData.endTime}</strong>
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}
          </Paper>

          {/* Additional Details */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: 3,
            mt: 3
          }}>
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
            disabled={loading || imageProcessing}
            variant="outlined"
            size={isMobile ? "medium" : "medium"}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || imageProcessing}
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