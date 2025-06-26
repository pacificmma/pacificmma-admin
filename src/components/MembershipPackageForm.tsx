// src/components/MembershipPackageForm.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  useMediaQuery,
  useTheme,
  IconButton,
  Alert,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Switch,
  Chip,
  Autocomplete,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider,
  Grid,
  InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SettingsIcon from '@mui/icons-material/Settings';
import {
  MembershipPackageFormData,
  MembershipPackageRecord,
  DurationType,
  SportCategory,
  MembershipPackageStatus,
} from '../types/membershipPackages';
import {
  createMembershipPackage,
  updateMembershipPackage,
  SPORT_CATEGORIES,
} from '../services/membershipPackageService';
import { useAuth } from '../contexts/AuthContext';
import { useRoleControl } from '../hooks/useRoleControl';

interface MembershipPackageFormProps {
  open: boolean;
  onClose: () => void;
  editData?: MembershipPackageRecord;
}

const steps = ['Basic Info', 'Access & Limits', 'Policies', 'Review'];

const MembershipPackageForm: React.FC<MembershipPackageFormProps> = ({
  open,
  onClose,
  editData
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<MembershipPackageFormData>({
    name: '',
    description: '',
    duration: 1,
    durationType: 'months',
    price: 0,
    sportCategories: [],
    isFullAccess: false,
    isUnlimited: true,
    classLimitPerWeek: undefined,
    classLimitPerMonth: undefined,
    allowFreeze: true,
    maxFreezeMonths: 2,
    minFreezeWeeks: 1,
    guestPassesIncluded: 0,
    autoRenewal: false,
    renewalDiscountPercent: undefined,
    earlyTerminationFee: undefined,
    minimumCommitmentMonths: undefined,
    status: 'Active',
    isPopular: false,
    displayOrder: 1,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { userData } = useRoleControl();

  useEffect(() => {
    if (open) {
      if (editData) {
        // Populate form with existing data
        setFormData({
          name: editData.name,
          description: editData.description,
          duration: editData.duration,
          durationType: editData.durationType,
          price: editData.price,
          sportCategories: editData.sportCategories,
          isFullAccess: editData.isFullAccess,
          isUnlimited: editData.isUnlimited,
          classLimitPerWeek: editData.classLimitPerWeek,
          classLimitPerMonth: editData.classLimitPerMonth,
          allowFreeze: editData.allowFreeze,
          maxFreezeMonths: editData.maxFreezeMonths,
          minFreezeWeeks: editData.minFreezeWeeks,
          guestPassesIncluded: editData.guestPassesIncluded,
          autoRenewal: editData.autoRenewal,
          renewalDiscountPercent: editData.renewalDiscountPercent,
          earlyTerminationFee: editData.earlyTerminationFee,
          minimumCommitmentMonths: editData.minimumCommitmentMonths,
          status: editData.status,
          isPopular: editData.isPopular,
          displayOrder: editData.displayOrder,
        });
      } else {
        // Reset form for new package
        setFormData({
          name: '',
          description: '',
          duration: 1,
          durationType: 'months',
          price: 0,
          sportCategories: [],
          isFullAccess: false,
          isUnlimited: true,
          classLimitPerWeek: undefined,
          classLimitPerMonth: undefined,
          allowFreeze: true,
          maxFreezeMonths: 2,
          minFreezeWeeks: 1,
          guestPassesIncluded: 0,
          autoRenewal: false,
          renewalDiscountPercent: undefined,
          earlyTerminationFee: undefined,
          minimumCommitmentMonths: undefined,
          status: 'Active',
          isPopular: false,
          displayOrder: 1,
        });
      }
      setActiveStep(0);
      setError(null);
    }
  }, [open, editData]);

  const handleInputChange = (field: keyof MembershipPackageFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Auto-adjust related fields
    if (field === 'isFullAccess' && value === true) {
      setFormData(prev => ({ ...prev, sportCategories: ['all'] }));
    }

    if (field === 'sportCategories' && value.includes('all')) {
      setFormData(prev => ({ ...prev, isFullAccess: true, sportCategories: ['all'] }));
    }

    if (field === 'isUnlimited' && value === true) {
      setFormData(prev => ({
        ...prev,
        classLimitPerWeek: undefined,
        classLimitPerMonth: undefined
      }));
    }

    if (error) setError(null);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Basic Info
        return !!(formData.name.trim() && formData.duration > 0 && formData.price >= 0);
      case 1: // Access & Limits
        return formData.isFullAccess || formData.sportCategories.length > 0;
      case 2: // Policies - always valid
        return true;
      case 3: // Review - final validation
        return !!(
          formData.name.trim() &&
          formData.duration > 0 &&
          formData.price >= 0 &&
          (formData.isFullAccess || formData.sportCategories.length > 0)
        );
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
      setError(null);
    } else {
      setError('Please complete all required fields in this step.');
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!user || !userData) {
      setError('You must be logged in to create membership packages.');
      return;
    }

    if (!validateStep(3)) {
      setError('Please complete all required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editData) {
        await updateMembershipPackage(editData.id, formData);
      } else {
        await createMembershipPackage(formData, userData.uid, userData.fullName);
      }

      handleClose();
    } catch (err: any) {
      console.error('Error saving membership package:', err);
      setError(err.message || 'An error occurred while saving the package');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setError(null);
    onClose();
  };

  const getDurationDisplay = () => {
    const { duration, durationType } = formData;
    const unit = durationType === 'months' ? 'month' : durationType === 'weeks' ? 'week' : 'day';
    return `${duration} ${unit}${duration > 1 ? 's' : ''}`;
  };

  const getPriceDisplay = () => {
    if (formData.durationType === 'months') {
      return `$${formData.price}/month`;
    }
    return `$${formData.price} total`;
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Basic Info
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <MonetizationOnIcon color="primary" />
              <Typography variant="h6">Basic Package Information</Typography>
            </Box>

            <TextField
              label="Package Name *"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="e.g., 3 Month BJJ Membership"
              fullWidth
              size="small"
            />

            <TextField
              label="Description"
              multiline
              rows={3}
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what's included in this package..."
              fullWidth
              size="small"
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <Box>
                <TextField
                  label="Duration *"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 1)}
                  InputProps={{ inputProps: { min: 1 } }}
                  fullWidth
                  size="small"
                />
              </Box>

              <Box>
                <FormControl fullWidth size="small">
                  <InputLabel>Duration Type</InputLabel>
                  <Select
                    value={formData.durationType}
                    label="Duration Type"
                    onChange={(e) => handleInputChange('durationType', e.target.value as DurationType)}
                  >
                    <MenuItem value="months">Months</MenuItem>
                    <MenuItem value="weeks">Weeks</MenuItem>
                    <MenuItem value="days">Days</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <TextField
              label="Price *"
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }}
              fullWidth
              size="small"
              helperText={formData.durationType === 'months' ? 'Monthly price' : 'Total package price'}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>

              <TextField
                label="Display Order"
                type="number"
                value={formData.displayOrder}
                onChange={(e) => handleInputChange('displayOrder', parseInt(e.target.value) || 1)}
                InputProps={{ inputProps: { min: 1 } }}
                fullWidth
                size="small"
                helperText="Order in package list"
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => handleInputChange('status', e.target.value as MembershipPackageStatus)}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                  <MenuItem value="Archived">Archived</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isPopular}
                  onChange={(e) => handleInputChange('isPopular', e.target.checked)}
                />
              }
              label="Mark as Popular Package"
            />
          </Box>
        );

      case 1: // Access & Limits
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FitnessCenterIcon color="primary" />
              <Typography variant="h6">Access & Usage Limits</Typography>
            </Box>

            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Sport Categories Access
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isFullAccess}
                    onChange={(e) => handleInputChange('isFullAccess', e.target.checked)}
                  />
                }
                label="Full Access (All Sports)"
                sx={{ mb: 2 }}
              />

              {!formData.isFullAccess && (
                <Autocomplete
                  multiple
                  options={SPORT_CATEGORIES.filter(cat => cat.id !== 'all')}
                  getOptionLabel={(option) => option.name}
                  value={SPORT_CATEGORIES.filter(cat => formData.sportCategories.includes(cat.id))}
                  onChange={(_, newValue) => {
                    handleInputChange('sportCategories', newValue.map(cat => cat.id));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select Sport Categories *"
                      placeholder="Choose sports included in this package"
                      size="small"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.name}
                        {...getTagProps({ index })}
                        size="small"
                        key={option.id}
                      />
                    ))
                  }
                />
              )}
            </Paper>

            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Usage Limits
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isUnlimited}
                    onChange={(e) => handleInputChange('isUnlimited', e.target.checked)}
                  />
                }
                label="Unlimited Classes"
                sx={{ mb: 2 }}
              />

              {!formData.isUnlimited && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <TextField
                      label="Classes per Week"
                      type="number"
                      value={formData.classLimitPerWeek || ''}
                      onChange={(e) => handleInputChange('classLimitPerWeek', parseInt(e.target.value) || undefined)}
                      InputProps={{ inputProps: { min: 1 } }}
                      fullWidth
                      size="small"
                    />
                  </Box>

                  <Box>
                    <TextField
                      label="Classes per Month"
                      type="number"
                      value={formData.classLimitPerMonth || ''}
                      onChange={(e) => handleInputChange('classLimitPerMonth', parseInt(e.target.value) || undefined)}
                      InputProps={{ inputProps: { min: 1 } }}
                      fullWidth
                      size="small"
                    />
                  </Box>
                </Box>
              )}
            </Paper>

            <TextField
              label="Guest Passes Included"
              type="number"
              value={formData.guestPassesIncluded || 0}
              onChange={(e) => handleInputChange('guestPassesIncluded', parseInt(e.target.value) || 0)}
              InputProps={{ inputProps: { min: 0 } }}
              fullWidth
              size="small"
              helperText="Number of guest passes included in this package"
            />
          </Box>
        );

      case 2: // Policies
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SettingsIcon color="primary" />
              <Typography variant="h6">Package Policies</Typography>
            </Box>

            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Freeze/Pause Policy
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.allowFreeze}
                    onChange={(e) => handleInputChange('allowFreeze', e.target.checked)}
                  />
                }
                label="Allow Membership Freeze"
                sx={{ mb: 2 }}
              />

              {formData.allowFreeze && (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <TextField
                      label="Max Freeze Months"
                      type="number"
                      value={formData.maxFreezeMonths || ''}
                      onChange={(e) => handleInputChange('maxFreezeMonths', parseInt(e.target.value) || undefined)}
                      InputProps={{ inputProps: { min: 1 } }}
                      fullWidth
                      size="small"
                    />
                  </Box>

                  <Box>
                    <TextField
                      label="Min Freeze Weeks"
                      type="number"
                      value={formData.minFreezeWeeks || ''}
                      onChange={(e) => handleInputChange('minFreezeWeeks', parseInt(e.target.value) || undefined)}
                      InputProps={{ inputProps: { min: 1 } }}
                      fullWidth
                      size="small"
                    />
                  </Box>
                </Box>
              )}
            </Paper>

            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Renewal & Commitment
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.autoRenewal}
                    onChange={(e) => handleInputChange('autoRenewal', e.target.checked)}
                  />
                }
                label="Auto Renewal Available"
                sx={{ mb: 2 }}
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                <Box>
                  <TextField
                    label="Renewal Discount %"
                    type="number"
                    value={formData.renewalDiscountPercent || ''}
                    onChange={(e) => handleInputChange('renewalDiscountPercent', parseFloat(e.target.value) || undefined)}
                    InputProps={{
                      inputProps: { min: 0, max: 100 },
                      endAdornment: <InputAdornment position="end">%</InputAdornment>
                    }}
                    fullWidth
                    size="small"
                  />
                </Box>

                <Box>
                  <TextField
                    label="Min Commitment (Months)"
                    type="number"
                    value={formData.minimumCommitmentMonths || ''}
                    onChange={(e) => handleInputChange('minimumCommitmentMonths', parseInt(e.target.value) || undefined)}
                    InputProps={{ inputProps: { min: 1 } }}
                    fullWidth
                    size="small"
                  />
                </Box>
              </Box>

              <TextField
                label="Early Termination Fee"
                type="number"
                value={formData.earlyTerminationFee || ''}
                onChange={(e) => handleInputChange('earlyTerminationFee', parseFloat(e.target.value) || undefined)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  inputProps: { min: 0 }
                }}
                fullWidth
                size="small"
                sx={{ mt: 2 }}
              />
            </Paper>
          </Box>
        );

      case 3: // Review
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Package Review
            </Typography>

            <Paper sx={{ p: 3, bgcolor: 'primary.lighter' }}>
              <Typography variant="h5" fontWeight={600} sx={{ mb: 1 }}>
                {formData.name}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {formData.isPopular && (
                  <Chip label="Popular" color="warning" size="small" />
                )}
                <Chip label={formData.status} color="primary" size="small" />
              </Box>

              <Typography variant="body1" sx={{ mb: 2 }}>
                {formData.description}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Duration
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {getDurationDisplay()}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Price
                  </Typography>
                  <Typography variant="h6" color="primary.main" fontWeight={600}>
                    {getPriceDisplay()}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Access
                  </Typography>
                  <Typography variant="body1">
                    {formData.isFullAccess ? 'Full Access' : `${formData.sportCategories.length} Sports`}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Usage
                  </Typography>
                  <Typography variant="body1">
                    {formData.isUnlimited ? 'Unlimited' : 'Limited'}
                  </Typography>
                </Box>
              </Box>

              {!formData.isFullAccess && formData.sportCategories.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Included Sports
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {formData.sportCategories.map(categoryId => {
                      const category = SPORT_CATEGORIES.find(cat => cat.id === categoryId);
                      return category ? (
                        <Chip
                          key={categoryId}
                          label={category.name}
                          size="small"
                          variant="outlined"
                        />
                      ) : null;
                    })}
                  </Box>
                </Box>
              )}

              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                {formData.allowFreeze && (
                  <Typography variant="caption" color="text.secondary">
                    ✓ Freeze allowed
                  </Typography>
                )}
                {formData.autoRenewal && (
                  <Typography variant="caption" color="text.secondary">
                    ✓ Auto-renewal available
                  </Typography>
                )}
                {formData.guestPassesIncluded && formData.guestPassesIncluded > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    ✓ {formData.guestPassesIncluded} guest passes
                  </Typography>
                )}
              </Box>
            </Paper>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
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
      }}>
        {editData ? 'Edit Membership Package' : 'Create New Membership Package'}
        {isMobile && (
          <IconButton onClick={handleClose} size="small" disabled={loading}>
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step Content */}
        {renderStepContent(activeStep)}
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
        >
          Cancel
        </Button>

        {activeStep > 0 && (
          <Button
            onClick={handleBack}
            disabled={loading}
            variant="outlined"
          >
            Back
          </Button>
        )}

        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={!validateStep(activeStep)}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || !validateStep(activeStep)}
          >
            {loading ? (editData ? 'Updating...' : 'Creating...') : (editData ? 'Update Package' : 'Create Package')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default MembershipPackageForm;