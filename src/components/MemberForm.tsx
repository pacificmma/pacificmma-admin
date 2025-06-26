// src/components/MemberForm.tsx - Fixed character deletion issue

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
  Divider,
  Chip,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Autocomplete,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import ContactEmergencyIcon from '@mui/icons-material/ContactEmergency';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import GavelIcon from '@mui/icons-material/Gavel';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SchoolIcon from '@mui/icons-material/School';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { 
  MemberFormData, 
  MembershipType, 
  PaymentMethod,
  EmergencyContact,
  MemberRecord,
  BeltLevel,
  StudentLevel 
} from '../types/members';
import { 
  createMember, 
  updateMember, 
  getAllBeltLevels, 
  getAllStudentLevels,
  awardBeltToMember,
  awardStudentLevelToMember 
} from '../services/memberService';
import { useAuth } from '../contexts/AuthContext';

interface MemberFormProps {
  open: boolean;
  onClose: () => void;
  editData?: MemberRecord | null;
}

const membershipTypes: MembershipType[] = ['Recurring', 'Prepaid'];
const paymentMethods: PaymentMethod[] = ['ACH', 'Credit Card', 'Cash', 'Check'];

const steps = ['Basic Info', 'Emergency Contact', 'Membership', 'Belt & Levels', 'Waiver & Notes'];

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
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    },
    membershipType: 'Recurring',
    autoRenew: false,
    waiverSigned: false,
    notes: '',
    tags: [],
  });

  // Belt and Level states
  const [availableBeltLevels, setAvailableBeltLevels] = useState<BeltLevel[]>([]);
  const [availableStudentLevels, setAvailableStudentLevels] = useState<StudentLevel[]>([]);
  const [selectedBelt, setSelectedBelt] = useState<BeltLevel | null>(null);
  const [selectedStudentLevel, setSelectedStudentLevel] = useState<StudentLevel | null>(null);
  const [beltAwardDate, setBeltAwardDate] = useState<Date | null>(null);
  const [studentLevelAwardDate, setStudentLevelAwardDate] = useState<Date | null>(null);
  const [beltNotes, setBeltNotes] = useState('');
  const [studentLevelNotes, setStudentLevelNotes] = useState('');

  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();

  // Load belt and level data only once when dialog opens
  useEffect(() => {
    if (open && !dataLoaded) {
      loadBeltAndLevelData();
    }
  }, [open, dataLoaded]);

  // Separate effect for handling edit data - only runs when editData changes
  useEffect(() => {
    if (open && editData && dataLoaded) {
      // Populate form with edit data
      setFormData({
        firstName: editData.firstName,
        lastName: editData.lastName,
        email: editData.email,
        phone: editData.phone,
        emergencyContact: editData.emergencyContact,
        dateOfBirth: editData.dateOfBirth?.toDate(),
        address: editData.address || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'USA',
        },
        membershipType: editData.membership.type,
        monthlyAmount: editData.membership.monthlyAmount,
        totalAmount: editData.membership.totalAmount,
        totalCredits: editData.membership.totalCredits,
        paymentMethod: editData.membership.paymentMethod,
        autoRenew: editData.membership.autoRenew,
        waiverSigned: editData.waiverSigned,
        medicalNotes: editData.medicalNotes,
        notes: editData.notes,
        tags: editData.tags || [],
      });

      // Set current belt and level if available
      if (editData.currentBeltLevel && availableBeltLevels.length > 0) {
        const belt = availableBeltLevels.find(b => b.id === editData.currentBeltLevel?.id);
        if (belt) setSelectedBelt(belt);
      }
      if (editData.currentStudentLevel && availableStudentLevels.length > 0) {
        const level = availableStudentLevels.find(l => l.id === editData.currentStudentLevel?.id);
        if (level) setSelectedStudentLevel(level);
      }
    } else if (open && !editData && dataLoaded) {
      // Reset form for new member
      resetForm();
      setActiveStep(0);
    }
  }, [editData, dataLoaded, open]); // Remove availableBeltLevels from dependencies

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
      setActiveStep(0);
      setDataLoaded(false);
    }
  }, [open]);

  const loadBeltAndLevelData = async () => {
    try {
      const [belts, levels] = await Promise.all([
        getAllBeltLevels(),
        getAllStudentLevels()
      ]);
      setAvailableBeltLevels(belts);
      setAvailableStudentLevels(levels);
      setDataLoaded(true);
    } catch (error) {
      console.error('Error loading belt and level data:', error);
      setDataLoaded(true); // Mark as loaded even on error to prevent infinite loading
    }
  };

  const resetForm = () => {
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
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA',
      },
      membershipType: 'Recurring',
      autoRenew: false,
      waiverSigned: false,
      notes: '',
      tags: [],
    });
    setSelectedBelt(null);
    setSelectedStudentLevel(null);
    setBeltAwardDate(null);
    setStudentLevelAwardDate(null);
    setBeltNotes('');
    setStudentLevelNotes('');
    setNewTag('');
  };

  const handleInputChange = (field: keyof MemberFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleEmergencyContactChange = (field: keyof EmergencyContact, value: string) => {
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [field]: value,
      },
    }));
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      handleInputChange('tags', [...(formData.tags || []), newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags?.filter(tag => tag !== tagToRemove) || []);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Basic Info
        return !!(formData.firstName.trim() && formData.lastName.trim() && 
                 formData.email.trim() && formData.phone.trim());
      case 1: // Emergency Contact
        return !!(formData.emergencyContact.name.trim() && 
                 formData.emergencyContact.relationship.trim() && 
                 formData.emergencyContact.phone.trim());
      case 2: // Membership
        if (formData.membershipType === 'Recurring') {
          // For recurring, monthly amount is optional (can be 0 for trial)
          return true;
        } else {
          // For prepaid, either total amount or total credits must be set
          return !!(formData.totalAmount && formData.totalAmount > 0) || 
                 !!(formData.totalCredits && formData.totalCredits > 0);
        }
      case 3: // Belt & Levels - optional step
        return true;
      case 4: // Waiver & Notes
        return formData.waiverSigned;
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
    if (!user) {
      setError('You must be logged in to create members.');
      return;
    }

    // Final validation
    if (!validateStep(4)) {
      setError('Please complete all required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Clean the form data - remove undefined values
      const cleanFormData = {
        ...formData,
        monthlyAmount: formData.monthlyAmount || undefined,
        totalAmount: formData.totalAmount || undefined,
        totalCredits: formData.totalCredits || undefined,
        paymentMethod: formData.paymentMethod || undefined,
        medicalNotes: formData.medicalNotes || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        emergencyContact: {
          ...formData.emergencyContact,
          email: formData.emergencyContact.email || undefined,
        },
      };

      let memberId: string;

      if (editData) {
        await updateMember(editData.id, cleanFormData, user.uid);
        memberId = editData.id;
      } else {
        const newMember = await createMember(cleanFormData, user.uid);
        memberId = newMember.id;
      }

      // Award belt if selected (only for new members or if belt changed)
      if (selectedBelt && beltAwardDate && 
          (!editData || editData.currentBeltLevel?.id !== selectedBelt.id)) {
        await awardBeltToMember(
          memberId,
          selectedBelt.id,
          user.uid,
          beltNotes || undefined
        );
      }

      // Award student level if selected (only for new members or if level changed)
      if (selectedStudentLevel && studentLevelAwardDate && 
          (!editData || editData.currentStudentLevel?.id !== selectedStudentLevel.id)) {
        await awardStudentLevelToMember(
          memberId,
          selectedStudentLevel.id,
          user.uid,
          studentLevelNotes || undefined
        );
      }
      
      handleClose();
    } catch (err: any) {
      console.error('Error saving member:', err);
      setError(err.message || 'An error occurred while saving the member');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Basic Info
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PersonIcon color="primary" />
              <Typography variant="h6">Basic Information</Typography>
            </Box>

            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
              gap: 2 
            }}>
              <TextField
                label="First Name *"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                size="small"
                error={!formData.firstName.trim() && formData.firstName !== ''}
              />
              <TextField
                label="Last Name *"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                size="small"
                error={!formData.lastName.trim() && formData.lastName !== ''}
              />
            </Box>

            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
              gap: 2 
            }}>
              <TextField
                label="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                size="small"
                error={!formData.email.trim() && formData.email !== ''}
              />
              <TextField
                label="Phone *"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                size="small"
                error={!formData.phone.trim() && formData.phone !== ''}
              />
            </Box>

            <DatePicker
              label="Date of Birth"
              value={formData.dateOfBirth || null}
              onChange={(newValue) => handleInputChange('dateOfBirth', newValue)}
              slotProps={{
                textField: {
                  size: "small",
                  fullWidth: true,
                },
              }}
            />

            <Divider />

            <Typography variant="subtitle1" fontWeight={600}>Address (Optional)</Typography>
            
            <TextField
              label="Street Address"
              value={formData.address?.street || ''}
              onChange={(e) => handleAddressChange('street', e.target.value)}
              size="small"
              fullWidth
            />

            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, 
              gap: 2 
            }}>
              <TextField
                label="City"
                value={formData.address?.city || ''}
                onChange={(e) => handleAddressChange('city', e.target.value)}
                size="small"
              />
              <TextField
                label="State"
                value={formData.address?.state || ''}
                onChange={(e) => handleAddressChange('state', e.target.value)}
                size="small"
              />
              <TextField
                label="ZIP Code"
                value={formData.address?.zipCode || ''}
                onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                size="small"
              />
            </Box>
          </Box>
        );

      case 1: // Emergency Contact
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ContactEmergencyIcon color="primary" />
              <Typography variant="h6">Emergency Contact</Typography>
            </Box>

            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
              gap: 2 
            }}>
              <TextField
                label="Contact Name *"
                value={formData.emergencyContact.name}
                onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                size="small"
                error={!formData.emergencyContact.name.trim() && formData.emergencyContact.name !== ''}
              />
              <TextField
                label="Relationship *"
                value={formData.emergencyContact.relationship}
                onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                size="small"
                placeholder="e.g., Spouse, Parent, Sibling"
                error={!formData.emergencyContact.relationship.trim() && formData.emergencyContact.relationship !== ''}
              />
            </Box>

            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
              gap: 2 
            }}>
              <TextField
                label="Phone *"
                value={formData.emergencyContact.phone}
                onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                size="small"
                error={!formData.emergencyContact.phone.trim() && formData.emergencyContact.phone !== ''}
              />
              <TextField
                label="Email"
                type="email"
                value={formData.emergencyContact.email || ''}
                onChange={(e) => handleEmergencyContactChange('email', e.target.value)}
                size="small"
              />
            </Box>
          </Box>
        );

      case 2: // Membership
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
              >
                {membershipTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {formData.membershipType === 'Recurring' ? (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
                gap: 2 
              }}>
                <TextField
                  label="Monthly Amount"
                  type="number"
                  value={formData.monthlyAmount || ''}
                  onChange={(e) => handleInputChange('monthlyAmount', parseFloat(e.target.value) || 0)}
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
                  }}
                  helperText="Leave 0 for trial or free membership"
                />
                
                <FormControl size="small">
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={formData.paymentMethod || ''}
                    label="Payment Method"
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value as PaymentMethod)}
                  >
                    {paymentMethods.map((method) => (
                      <MenuItem key={method} value={method}>
                        {method}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            ) : (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, 
                gap: 2 
              }}>
                <TextField
                  label="Total Amount"
                  type="number"
                  value={formData.totalAmount || ''}
                  onChange={(e) => handleInputChange('totalAmount', parseFloat(e.target.value) || 0)}
                  size="small"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    inputProps: { min: 0, step: 0.01 }
                  }}
                  helperText="For prepaid membership periods"
                />
                
                <TextField
                  label="Total Credits"
                  type="number"
                  value={formData.totalCredits || ''}
                  onChange={(e) => handleInputChange('totalCredits', parseInt(e.target.value) || 0)}
                  size="small"
                  InputProps={{
                    inputProps: { min: 0, step: 1 }
                  }}
                  helperText="For credit-based memberships"
                />
              </Box>
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.autoRenew}
                  onChange={(e) => handleInputChange('autoRenew', e.target.checked)}
                />
              }
              label="Auto-renew membership"
            />
          </Box>
        );

      case 3: // Belt & Levels
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <EmojiEventsIcon color="primary" />
              <Typography variant="h6">Belt & Student Levels (Optional)</Typography>
            </Box>

            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Belt Level
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 2 }}>
                <Autocomplete
                  value={selectedBelt}
                  onChange={(_, newValue) => setSelectedBelt(newValue)}
                  options={availableBeltLevels}
                  getOptionLabel={(option) => `${option.name} (${option.style})`}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Belt Level"
                      size="small"
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {option.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.style}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />

                <DatePicker
                  label="Date Awarded"
                  value={beltAwardDate}
                  onChange={(newValue) => setBeltAwardDate(newValue)}
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                    },
                  }}
                  disabled={!selectedBelt}
                />
              </Box>

              <TextField
                label="Belt Award Notes"
                value={beltNotes}
                onChange={(e) => setBeltNotes(e.target.value)}
                size="small"
                fullWidth
                multiline
                rows={2}
                disabled={!selectedBelt}
                placeholder="Optional notes about belt award..."
              />
            </Paper>

            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Student Level
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 2 }}>
                <Autocomplete
                  value={selectedStudentLevel}
                  onChange={(_, newValue) => setSelectedStudentLevel(newValue)}
                  options={availableStudentLevels}
                  getOptionLabel={(option) => option.name}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Student Level"
                      size="small"
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {option.name}
                        </Typography>
                        {option.description && (
                          <Typography variant="caption" color="text.secondary">
                            {option.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                />

                <DatePicker
                  label="Date Awarded"
                  value={studentLevelAwardDate}
                  onChange={(newValue) => setStudentLevelAwardDate(newValue)}
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                    },
                  }}
                  disabled={!selectedStudentLevel}
                />
              </Box>

              <TextField
                label="Student Level Notes"
                value={studentLevelNotes}
                onChange={(e) => setStudentLevelNotes(e.target.value)}
                size="small"
                fullWidth
                multiline
                rows={2}
                disabled={!selectedStudentLevel}
                placeholder="Optional notes about level award..."
              />
            </Paper>

            <Alert severity="info">
              <Typography variant="body2">
                Belt and student levels are optional and can be added or changed later.
                Only fill these if the member is starting with an existing belt/level.
              </Typography>
            </Alert>
          </Box>
        );

      case 4: // Waiver & Notes
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <GavelIcon color="primary" />
              <Typography variant="h6">Waiver & Additional Information</Typography>
            </Box>

            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.waiverSigned}
                    onChange={(e) => handleInputChange('waiverSigned', e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2">
                    <strong>Waiver Signed *</strong>
                    <br />
                    Member has read, understood, and signed the liability waiver
                  </Typography>
                }
              />
            </Paper>

            <TextField
              label="Medical Notes"
              multiline
              rows={3}
              value={formData.medicalNotes || ''}
              onChange={(e) => handleInputChange('medicalNotes', e.target.value)}
              size="small"
              placeholder="Any medical conditions, allergies, or special considerations..."
            />

            <TextField
              label="General Notes"
              multiline
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              size="small"
              placeholder="Additional notes about this member..."
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Member Tags</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {formData.tags?.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleRemoveTag(tag)}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="Add Tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  size="small"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  size="small"
                >
                  Add
                </Button>
              </Box>
            </Box>
          </Box>
        );

      default:
        return null;
    }
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
        }}>
          {editData ? 'Edit Member' : 'Add New Member'}
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
              {loading ? (editData ? 'Updating...' : 'Creating...') : (editData ? 'Update Member' : 'Create Member')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default MemberForm;