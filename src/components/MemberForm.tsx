// src/components/MemberForm.tsx - Fixed implementation with proper error handling and security

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
  Chip,
  Autocomplete,
  Paper,
  Divider,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  LinearProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import SecurityIcon from '@mui/icons-material/Security';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { 
  MemberFormData, 
  MemberRecord, 
  MembershipType, 
  PaymentMethod,
  EmergencyContact,
  Address 
} from '../types/members';
import { createMember, updateMember } from '../services/memberService';
import { useAuth } from '../contexts/AuthContext';
import { useRoleControl } from '../hooks/useRoleControl';

interface MemberFormProps {
  open: boolean;
  onClose: () => void;
  editData?: MemberRecord;
}

const steps = ['Personal Info', 'Contact & Emergency', 'Membership Details', 'Final Review'];

const membershipTypes: MembershipType[] = ['Recurring', 'Prepaid'];
const paymentMethods: PaymentMethod[] = ['ACH', 'Credit Card', 'Cash', 'Check'];

const commonTags = [
  'New Member', 'Returning Member', 'Student', 'Senior', 'Military', 
  'First Responder', 'BJJ', 'Muay Thai', 'Boxing', 'MMA', 'Wrestling'
];

const MemberForm: React.FC<MemberFormProps> = ({ open, onClose, editData }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<MemberFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      email: '',
    },
    dateOfBirth: undefined,
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    },
    membershipType: 'Recurring',
    monthlyAmount: 0,
    totalAmount: 0,
    totalCredits: 0,
    paymentMethod: 'ACH',
    autoRenew: true,
    waiverSigned: false,
    medicalNotes: '',
    notes: '',
    tags: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [memberCreated, setMemberCreated] = useState<{ memberRecord: MemberRecord; password: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { userData } = useRoleControl();

  useEffect(() => {
    if (open) {
      if (editData) {
        // Populate form with existing member data
        setFormData({
          firstName: editData.firstName || '',
          lastName: editData.lastName || '',
          email: editData.email || '',
          phone: editData.phone || '',
          emergencyContact: {
            name: editData.emergencyContact?.name || '',
            relationship: editData.emergencyContact?.relationship || '',
            phone: editData.emergencyContact?.phone || '',
            email: editData.emergencyContact?.email || '',
          },
          dateOfBirth: editData.dateOfBirth ? editData.dateOfBirth.toDate() : undefined,
          address: {
            street: editData.address?.street || '',
            city: editData.address?.city || '',
            state: editData.address?.state || '',
            zipCode: editData.address?.zipCode || '',
            country: editData.address?.country || 'USA',
          },
          membershipType: editData.membership?.type || 'Recurring',
          monthlyAmount: editData.membership?.monthlyAmount || 0,
          totalAmount: editData.membership?.totalAmount || 0,
          totalCredits: editData.membership?.totalCredits || 0,
          paymentMethod: editData.membership?.paymentMethod || 'ACH',
          autoRenew: editData.membership?.autoRenew || false,
          waiverSigned: editData.waiverSigned || false,
          medicalNotes: editData.medicalNotes || '',
          notes: editData.notes || '',
          tags: editData.tags || [],
        });
      } else {
        // Reset form for new member
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          emergencyContact: {
            name: '',
            relationship: '',
            phone: '',
            email: '',
          },
          dateOfBirth: undefined,
          address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'USA',
          },
          membershipType: 'Recurring',
          monthlyAmount: 0,
          totalAmount: 0,
          totalCredits: 0,
          paymentMethod: 'ACH',
          autoRenew: true,
          waiverSigned: false,
          medicalNotes: '',
          notes: '',
          tags: [],
        });
      }
      setActiveStep(0);
      setError(null);
      setValidationErrors({});
      setMemberCreated(null);
      setShowPassword(false);
    }
  }, [open, editData]);

  const handleInputChange = (field: keyof MemberFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    if (error) setError(null);
  };

  const handleNestedInputChange = (
    parentField: 'emergencyContact' | 'address',
    field: string,
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [field]: value
      }
    }));

    // Clear validation error
    const errorKey = `${parentField}.${field}`;
    if (validationErrors[errorKey]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }

    if (error) setError(null);
  };

  const validateStep = (step: number): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 0: // Personal Info
        if (!formData.firstName.trim()) errors.firstName = 'First name is required';
        if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
        if (!formData.email.trim()) {
          errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          errors.email = 'Please enter a valid email address';
        }
        if (!formData.phone.trim()) {
          errors.phone = 'Phone number is required';
        } else if (!/^\d{10,}$/.test(formData.phone.replace(/\D/g, ''))) {
          errors.phone = 'Please enter a valid phone number';
        }
        break;

      case 1: // Contact & Emergency
        if (!formData.emergencyContact.name.trim()) {
          errors['emergencyContact.name'] = 'Emergency contact name is required';
        }
        if (!formData.emergencyContact.relationship.trim()) {
          errors['emergencyContact.relationship'] = 'Relationship is required';
        }
        if (!formData.emergencyContact.phone.trim()) {
          errors['emergencyContact.phone'] = 'Emergency contact phone is required';
        } else if (!/^\d{10,}$/.test(formData.emergencyContact.phone.replace(/\D/g, ''))) {
          errors['emergencyContact.phone'] = 'Please enter a valid phone number';
        }
        // Emergency contact email is optional, but validate if provided
        if (formData.emergencyContact.email && 
            formData.emergencyContact.email.trim() && 
            !/\S+@\S+\.\S+/.test(formData.emergencyContact.email)) {
          errors['emergencyContact.email'] = 'Please enter a valid email address';
        }
        break;

      case 2: // Membership Details
        if (formData.membershipType === 'Recurring') {
          if (!formData.monthlyAmount || formData.monthlyAmount <= 0) {
            errors.monthlyAmount = 'Monthly amount is required for recurring memberships';
          }
        } else if (formData.membershipType === 'Prepaid') {
          if (!formData.totalAmount || formData.totalAmount <= 0) {
            errors.totalAmount = 'Total amount is required for prepaid memberships';
          }
          if (!formData.totalCredits || formData.totalCredits <= 0) {
            errors.totalCredits = 'Total credits is required for prepaid memberships';
          }
        }
        break;

      case 3: // Final Review - check waiver
        if (!formData.waiverSigned) {
          errors.waiverSigned = 'Waiver must be signed to create member account';
        }
        break;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };

  const handleNext = () => {
    const validation = validateStep(activeStep);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setError('Please correct the errors before proceeding.');
      return;
    }

    setValidationErrors({});
    setError(null);
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setError(null);
    setValidationErrors({});
  };

  const handleSubmit = async () => {
    try {
      // Final validation
      const validation = validateStep(3);
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        setError('Please correct all errors before submitting.');
        return;
      }

      if (!user || !userData) {
        setError('You must be logged in to create members.');
        return;
      }

      setLoading(true);
      setError(null);

      if (editData) {
        // Update existing member
        await updateMember(editData.id, formData, userData.uid);
        handleClose();
      } else {
        // Create new member with Firebase Auth
        console.log('Creating new member...');
        const result = await createMember(formData, userData.uid);
        
        console.log('Member created successfully:', result.memberRecord.id);
        setMemberCreated(result);
        setShowPassword(true);
      }
    } catch (err: any) {
      console.error('Error saving member:', err);
      setError(err.message || 'An error occurred while saving the member');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return; // Prevent closing during operation
    
    setActiveStep(0);
    setError(null);
    setValidationErrors({});
    setMemberCreated(null);
    setShowPassword(false);
    onClose();
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Personal Info
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PersonIcon color="primary" />
              <Typography variant="h6">Personal Information</Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
              <TextField
                label="First Name *"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                size="small"
                error={!!validationErrors.firstName}
                helperText={validationErrors.firstName}
                disabled={loading}
              />
              <TextField
                label="Last Name *"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                size="small"
                error={!!validationErrors.lastName}
                helperText={validationErrors.lastName}
                disabled={loading}
              />
            </Box>

            <TextField
              label="Email Address *"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              size="small"
              error={!!validationErrors.email}
              helperText={validationErrors.email || 'This will be used for customer portal access'}
              disabled={loading || !!editData} // Can't change email for existing members
            />

            <TextField
              label="Phone Number *"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              size="small"
              error={!!validationErrors.phone}
              helperText={validationErrors.phone}
              disabled={loading}
              placeholder="(555) 123-4567"
            />

            <DatePicker
              label="Date of Birth (Optional)"
              value={formData.dateOfBirth || null}
              onChange={(newValue) => handleInputChange('dateOfBirth', newValue)}
              slotProps={{
                textField: {
                  size: "small",
                  helperText: "Used for age verification and special programs",
                  disabled: loading,
                },
              }}
              maxDate={new Date()}
            />
          </Box>
        );

      case 1: // Contact & Emergency
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ContactPhoneIcon color="primary" />
              <Typography variant="h6">Contact & Emergency Information</Typography>
            </Box>

            {/* Address */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Address (Optional)</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Street Address"
                  value={formData.address?.street || ''}
                  onChange={(e) => handleNestedInputChange('address', 'street', e.target.value)}
                  size="small"
                  disabled={loading}
                />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="City"
                    value={formData.address?.city || ''}
                    onChange={(e) => handleNestedInputChange('address', 'city', e.target.value)}
                    size="small"
                    disabled={loading}
                  />
                  <TextField
                    label="State"
                    value={formData.address?.state || ''}
                    onChange={(e) => handleNestedInputChange('address', 'state', e.target.value)}
                    size="small"
                    disabled={loading}
                  />
                  <TextField
                    label="ZIP Code"
                    value={formData.address?.zipCode || ''}
                    onChange={(e) => handleNestedInputChange('address', 'zipCode', e.target.value)}
                    size="small"
                    disabled={loading}
                  />
                </Box>
              </Box>
            </Paper>

            {/* Emergency Contact */}
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Emergency Contact *</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                  <TextField
                    label="Full Name *"
                    value={formData.emergencyContact.name}
                    onChange={(e) => handleNestedInputChange('emergencyContact', 'name', e.target.value)}
                    size="small"
                    error={!!validationErrors['emergencyContact.name']}
                    helperText={validationErrors['emergencyContact.name']}
                    disabled={loading}
                  />
                  <TextField
                    label="Relationship *"
                    value={formData.emergencyContact.relationship}
                    onChange={(e) => handleNestedInputChange('emergencyContact', 'relationship', e.target.value)}
                    size="small"
                    error={!!validationErrors['emergencyContact.relationship']}
                    helperText={validationErrors['emergencyContact.relationship']}
                    disabled={loading}
                    placeholder="Parent, Spouse, Friend, etc."
                  />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                  <TextField
                    label="Phone Number *"
                    value={formData.emergencyContact.phone}
                    onChange={(e) => handleNestedInputChange('emergencyContact', 'phone', e.target.value)}
                    size="small"
                    error={!!validationErrors['emergencyContact.phone']}
                    helperText={validationErrors['emergencyContact.phone']}
                    disabled={loading}
                    placeholder="(555) 123-4567"
                  />
                  <TextField
                    label="Email (Optional)"
                    type="email"
                    value={formData.emergencyContact.email || ''}
                    onChange={(e) => handleNestedInputChange('emergencyContact', 'email', e.target.value)}
                    size="small"
                    error={!!validationErrors['emergencyContact.email']}
                    helperText={validationErrors['emergencyContact.email']}
                    disabled={loading}
                  />
                </Box>
              </Box>
            </Paper>
          </Box>
        );

      case 2: // Membership Details
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CreditCardIcon color="primary" />
              <Typography variant="h6">Membership Details</Typography>
            </Box>

            <FormControl size="small">
              <InputLabel>Membership Type *</InputLabel>
              <Select
                value={formData.membershipType}
                label="Membership Type *"
                onChange={(e) => handleInputChange('membershipType', e.target.value as MembershipType)}
                disabled={loading}
              >
                {membershipTypes.map(type => (
                  <MenuItem key={type} value={type}>
                    {type === 'Recurring' ? 'Recurring Monthly' : 'Prepaid Credits'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {formData.membershipType === 'Recurring' ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Monthly Amount *"
                  type="number"
                  value={formData.monthlyAmount || ''}
                  onChange={(e) => handleInputChange('monthlyAmount', parseFloat(e.target.value) || 0)}
                  size="small"
                  error={!!validationErrors.monthlyAmount}
                  helperText={validationErrors.monthlyAmount}
                  disabled={loading}
                  InputProps={{
                    startAdornment: <Typography>$</Typography>,
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.autoRenew}
                      onChange={(e) => handleInputChange('autoRenew', e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label="Auto-renew membership"
                />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Total Amount *"
                  type="number"
                  value={formData.totalAmount || ''}
                  onChange={(e) => handleInputChange('totalAmount', parseFloat(e.target.value) || 0)}
                  size="small"
                  error={!!validationErrors.totalAmount}
                  helperText={validationErrors.totalAmount}
                  disabled={loading}
                  InputProps={{
                    startAdornment: <Typography>$</Typography>,
                    inputProps: { min: 0, step: 0.01 }
                  }}
                />
                <TextField
                  label="Total Credits *"
                  type="number"
                  value={formData.totalCredits || ''}
                  onChange={(e) => handleInputChange('totalCredits', parseInt(e.target.value) || 0)}
                  size="small"
                  error={!!validationErrors.totalCredits}
                  helperText={validationErrors.totalCredits || 'Number of classes/sessions included'}
                  disabled={loading}
                  InputProps={{
                    inputProps: { min: 1 }
                  }}
                />
              </Box>
            )}

            <FormControl size="small">
              <InputLabel>Payment Method</InputLabel>
              <Select
                value={formData.paymentMethod}
                label="Payment Method"
                onChange={(e) => handleInputChange('paymentMethod', e.target.value as PaymentMethod)}
                disabled={loading}
              >
                {paymentMethods.map(method => (
                  <MenuItem key={method} value={method}>{method}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              multiple
              options={commonTags}
              freeSolo
              value={formData.tags || []}
              onChange={(_, newValue) => handleInputChange('tags', newValue)}
              disabled={loading}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Tags (Optional)"
                  placeholder="Add tags..."
                  size="small"
                  helperText="Use tags to categorize members"
                />
              )}
            />
          </Box>
        );

      case 3: // Final Review
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SecurityIcon color="primary" />
              <Typography variant="h6">Final Review & Waiver</Typography>
            </Box>

            {/* Review Summary */}
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>Member Summary</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1 }}>
                <Typography variant="body2">
                  <strong>Name:</strong> {formData.firstName} {formData.lastName}
                </Typography>
                <Typography variant="body2">
                  <strong>Email:</strong> {formData.email}
                </Typography>
                <Typography variant="body2">
                  <strong>Phone:</strong> {formData.phone}
                </Typography>
                <Typography variant="body2">
                  <strong>Membership:</strong> {formData.membershipType}
                  {formData.membershipType === 'Recurring' 
                    ? ` - $${formData.monthlyAmount}/month`
                    : ` - ${formData.totalCredits} credits for $${formData.totalAmount}`
                  }
                </Typography>
                <Typography variant="body2">
                  <strong>Emergency Contact:</strong> {formData.emergencyContact.name} ({formData.emergencyContact.relationship})
                </Typography>
                <Typography variant="body2">
                  <strong>Payment Method:</strong> {formData.paymentMethod}
                </Typography>
              </Box>
            </Paper>

            {/* Medical Notes */}
            <TextField
              label="Medical Notes (Optional)"
              multiline
              rows={3}
              value={formData.medicalNotes || ''}
              onChange={(e) => handleInputChange('medicalNotes', e.target.value)}
              size="small"
              disabled={loading}
              helperText="Any medical conditions, allergies, or limitations to be aware of"
            />

            {/* Internal Notes */}
            <TextField
              label="Internal Notes (Optional)"
              multiline
              rows={2}
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              size="small"
              disabled={loading}
              helperText="Internal notes for staff reference"
            />

            {/* Waiver */}
            <Paper sx={{ p: 2, border: 1, borderColor: 'primary.main' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.waiverSigned}
                    onChange={(e) => handleInputChange('waiverSigned', e.target.checked)}
                    disabled={loading}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2">
                    <strong>Liability Waiver Signed *</strong>
                    <br />
                    I confirm that the liability waiver has been signed by the member or their legal guardian.
                  </Typography>
                }
              />
              {validationErrors.waiverSigned && (
                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                  {validationErrors.waiverSigned}
                </Typography>
              )}
            </Paper>

            {!editData && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>New Member Account:</strong><br />
                  A customer portal account will be created automatically with a secure password.
                  The password will be displayed after member creation.
                </Typography>
              </Alert>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  // Success screen after member creation
  if (memberCreated && showPassword) {
    return (
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
        disableEscapeKeyDown
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Typography variant="h5" color="success.main" fontWeight={600}>
            ✓ Member Created Successfully!
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          <Paper sx={{ p: 3, bgcolor: 'success.lighter', mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {memberCreated.memberRecord.firstName} {memberCreated.memberRecord.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Member ID: {memberCreated.memberRecord.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A customer portal account has been created with the following credentials:
            </Typography>
          </Paper>

          <Paper sx={{ p: 2, bgcolor: 'warning.lighter', border: 1, borderColor: 'warning.main' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              🔐 Customer Portal Login Credentials
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Email:</strong> {memberCreated.memberRecord.email}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Temporary Password:</strong> <code style={{ fontSize: '1.1em', fontWeight: 'bold' }}>{memberCreated.password}</code>
            </Typography>
            <Typography variant="caption" color="warning.main">
              ⚠️ Please provide these credentials to the member securely. They can change their password after first login.
            </Typography>
          </Paper>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              The member can access the customer portal at <strong>www.pacificmma.com</strong> to book classes, view their membership, and more.
            </Typography>
          </Alert>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleClose}
            variant="contained"
            color="success"
            fullWidth
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        fullScreen={isMobile}
        disableEscapeKeyDown={loading}
        sx={{
          '& .MuiDialog-paper': {
            margin: isMobile ? 0 : 2,
            width: isMobile ? '100%' : 'auto',
            maxHeight: isMobile ? '100%' : 'calc(100% - 64px)',
          },
        }}
      >
        {loading && (
          <LinearProgress 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              zIndex: 1 
            }} 
          />
        )}

        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}>
          <Typography variant="h6">
            {editData ? 'Edit Member' : 'Add New Member'}
          </Typography>
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
              disabled={loading}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? (editData ? 'Updating...' : 'Creating Member...') : (editData ? 'Update Member' : 'Create Member')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default MemberForm;