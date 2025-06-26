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
  CircularProgress,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CompressIcon from '@mui/icons-material/Compress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RepeatIcon from '@mui/icons-material/Repeat';
import EventIcon from '@mui/icons-material/Event';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { createClass, updateClass, getInstructors, ClassData, createPackage, PackageData } from '../services/classService';
import { previewDiscountCode, formatDiscountDisplay } from '../utils/discountUtils';
import { addDays, format, addWeeks, addMonths } from 'date-fns';
import {
  optimizeImage,
  validateImageFile,
  formatFileSize,
  DEFAULT_CLASS_IMAGE_OPTIONS,
  OptimizedImageResult
} from '../utils/imageUtils';
import { useRoleControl } from '../hooks/useRoleControl';

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

  // Paket fiyatı için ayrı state
  const [packagePrice, setPackagePrice] = useState<number>(0);

  // Discount state
  const [discountCode, setDiscountCode] = useState<string>('');
  const [discountValidation, setDiscountValidation] = useState<any>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [showDiscountSection, setShowDiscountSection] = useState(false);

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
  const { isAdmin } = useRoleControl();

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

    // Trigger discount validation if price changes
    if ((field === 'price' || field === 'type') && discountCode.trim()) {
      handleDiscountCodeChange(discountCode);
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

  const handleDiscountCodeChange = async (code: string) => {
    setDiscountCode(code);
    setDiscountValidation(null);

    if (!code.trim()) {
      return;
    }

    // Determine item type and price for validation
    const itemType = formData.type === 'workshop' ? 'workshop' : 'class';
    const price = scheduleSettings.scheduleType === 'recurring' ? packagePrice : formData.price;

    if (price <= 0) {
      return;
    }

    setDiscountLoading(true);
    try {
      const validation = await previewDiscountCode(
        code,
        scheduleSettings.scheduleType === 'recurring' ? 'package' : itemType,
        'temp-id', // We don't have ID yet, but validation can work without it for most cases
        price
      );

      setDiscountValidation(validation);
    } catch (error) {
      console.error('Error validating discount:', error);
      setDiscountValidation({
        isValid: false,
        error: 'Failed to validate discount code'
      });
    } finally {
      setDiscountLoading(false);
    }
  };

  const getFinalPrice = () => {
    const basePrice = scheduleSettings.scheduleType === 'recurring' ? packagePrice : formData.price;
    
    if (discountValidation?.isValid && discountValidation.finalAmount !== undefined) {
      return discountValidation.finalAmount;
    }
    
    return basePrice;
  };

  const getDiscountAmount = () => {
    if (discountValidation?.isValid && discountValidation.discountAmount !== undefined) {
      return discountValidation.discountAmount;
    }
    return 0;
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

  const generateClassDates = () => {
    if (scheduleSettings.scheduleType === 'single') {
      return [scheduleSettings.startDate];
    }

    const dates = [];
    const endDate = calculateEndDate();
    let currentDate = new Date(scheduleSettings.startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      if (scheduleSettings.daysOfWeek.includes(dayOfWeek)) {
        dates.push(new Date(currentDate));
      }
      
      currentDate = addDays(currentDate, 1);
    }

    return dates;
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

    if (scheduleSettings.scheduleType === 'recurring') {
      if (scheduleSettings.daysOfWeek.length === 0) {
        setError('Please select at least one day for recurring classes');
        return;
      }
      if (packagePrice <= 0) {
        setError('Please set a package price for recurring classes');
        return;
      }
    } else {
      if (formData.price < 0) {
        setError('Price cannot be negative');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const imageFile = optimizedImage?.file || undefined;

      if (editData) {
        // Edit existing single class
        await updateClass(editData.id, formData, imageFile);
      } else {
        if (scheduleSettings.scheduleType === 'single') {
          // Create single class
          const classData = {
            ...formData,
            date: scheduleSettings.startDate
          };
          await createClass(classData, imageFile);
        } else {
          // Create package with multiple sessions
          const classDates = generateClassDates();
          
          const packageData: PackageData = {
            title: formData.title,
            description: formData.description,
            type: formData.type,
            startTime: formData.startTime,
            endTime: formData.endTime,
            location: formData.location,
            capacity: formData.capacity,
            instructorId: formData.instructorId,
            instructorName: formData.instructorName,
            packagePrice: packagePrice,
            totalSessions: classDates.length,
            isActive: formData.isActive,
            daysOfWeek: scheduleSettings.daysOfWeek,
            startDate: scheduleSettings.startDate,
            endDate: calculateEndDate(),
            createdAt: null as any, // Will be set in service
            updatedAt: null as any, // Will be set in service
          };

          await createPackage(packageData, classDates, imageFile);
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
    setPackagePrice(0);
    setOriginalImageFile(null);
    setOptimizedImage(null);
    setImagePreview('');
    setError(null);
    setImageError(null);
    setDiscountCode('');
    setDiscountValidation(null);
    setShowDiscountSection(false);
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
                    label="Recurring Package" 
                  />
                </RadioGroup>
              </FormControl>
            )}

            {/* Single Class Date or Recurring Settings */}
            {scheduleSettings.scheduleType === 'single' ? (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, 
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

                {/* Single Class Price */}
                <TextField
                  label="Price"
                  type="number"
                  fullWidth
                  value={formData.price}
                  onChange={(e) => {
                    const newPrice = parseFloat(e.target.value) || 0;
                    handleInputChange('price', newPrice);
                  }}
                  variant="outlined"
                  size={isMobile ? "small" : "medium"}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
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
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(6, 1fr)' }, 
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

                  {/* Package Price */}
                  <TextField
                    label="Package Price *"
                    type="number"
                    fullWidth
                    value={packagePrice}
                    onChange={(e) => {
                      const newPrice = parseFloat(e.target.value) || 0;
                      setPackagePrice(newPrice);
                      // Trigger discount validation if discount code exists
                      if (discountCode.trim()) {
                        handleDiscountCodeChange(discountCode);
                      }
                    }}
                    variant="outlined"
                    size={isMobile ? "small" : "medium"}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      inputProps: { min: 0, step: 0.01 }
                    }}
                    helperText="Total price for entire package"
                  />
                </Box>

                {/* Schedule Preview */}
                {scheduleSettings.daysOfWeek.length > 0 && formData.startTime && formData.endTime && packagePrice > 0 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      <strong>Package Preview:</strong><br />
                      Classes will run from <strong>{format(scheduleSettings.startDate, 'MMM dd, yyyy')}</strong> to <strong>{format(calculateEndDate(), 'MMM dd, yyyy')}</strong><br />
                      Total sessions: <strong>{generateClassDates().length}</strong><br />
                      Time: <strong>{formData.startTime} - {formData.endTime}</strong><br />
                      Package price: <strong>${packagePrice}</strong> (${(packagePrice / generateClassDates().length).toFixed(2)} per session)
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
                helperText={scheduleSettings.scheduleType === 'recurring' ? 'Per session' : 'Total capacity'}
              />
            </Box>
          </Box>

          {/* Discount Section - Only for Admin */}
          {isAdmin && (
            <Paper sx={{ mt: 3, p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalOfferIcon />
                  Apply Discount Code
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowDiscountSection(!showDiscountSection)}
                >
                  {showDiscountSection ? 'Hide' : 'Show'}
                </Button>
              </Box>

              {showDiscountSection && (
                <Box>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                    <TextField
                      label="Discount Code"
                      value={discountCode}
                      onChange={(e) => handleDiscountCodeChange(e.target.value.toUpperCase())}
                      size="small"
                      sx={{ flex: 1 }}
                      placeholder="Enter discount code (e.g., SAVE20)"
                      disabled={discountLoading}
                    />
                    <Button
                      variant="outlined"
                      onClick={() => handleDiscountCodeChange(discountCode)}
                      disabled={!discountCode.trim() || discountLoading}
                      size="small"
                      sx={{ mt: 0.5 }}
                    >
                      {discountLoading ? <CircularProgress size={20} /> : 'Validate'}
                    </Button>
                  </Box>

                  {/* Discount Validation Results */}
                  {discountValidation && (
                    <Box sx={{ mb: 2 }}>
                      {discountValidation.isValid ? (
                        <Alert severity="success" sx={{ mb: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            Valid Discount: {formatDiscountDisplay(
                              discountValidation.discount.type, 
                              discountValidation.discount.value
                            )}
                          </Typography>
                          <Typography variant="body2">
                            {discountValidation.discount.name}
                          </Typography>
                        </Alert>
                      ) : (
                        <Alert severity="error" sx={{ mb: 1 }}>
                          <Typography variant="body2">
                            {discountValidation.error}
                          </Typography>
                        </Alert>
                      )}
                    </Box>
                  )}

                  {/* Price Summary with Discount */}
                  {(formData.price > 0 || packagePrice > 0) && (
                    <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                        Price Summary:
                      </Typography>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          {scheduleSettings.scheduleType === 'recurring' ? 'Package Price:' : 'Class Price:'}
                        </Typography>
                        <Typography variant="body2">
                          ${scheduleSettings.scheduleType === 'recurring' ? packagePrice : formData.price}
                        </Typography>
                      </Box>

                      {getDiscountAmount() > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'success.main' }}>
                          <Typography variant="body2">
                            Discount ({discountCode}):
                          </Typography>
                          <Typography variant="body2">
                            -${getDiscountAmount()}
                          </Typography>
                        </Box>
                      )}

                      <Divider sx={{ my: 1 }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1" fontWeight={600}>
                          Final Price:
                        </Typography>
                        <Typography variant="body1" fontWeight={600} color="primary.main">
                          ${getFinalPrice()}
                        </Typography>
                      </Box>

                      {getDiscountAmount() > 0 && (
                        <Typography variant="caption" color="success.main" sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}>
                          You save ${getDiscountAmount()}!
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              )}
            </Paper>
          )}
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
            {loading ? (editData ? 'Updating...' : 'Creating...') : (
              editData ? 'Update' : 
              scheduleSettings.scheduleType === 'recurring' ? 'Create Package' : 'Create Class'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default ClassForm;