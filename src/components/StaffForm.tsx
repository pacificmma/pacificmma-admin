import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
  IconButton,
  InputAdornment,
  LinearProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { createStaffSecure, StaffData } from '../services/staffService';
import { useAuth } from '../contexts/AuthContext';

interface StaffFormProps {
  open: boolean;
  onClose: () => void;
}

const roles = ['staff', 'trainer', 'admin'];

const StaffForm: React.FC<StaffFormProps> = ({ open, onClose }) => {
  const [formData, setFormData] = useState<StaffData>({
    fullName: '',
    email: '',
    password: '',
    role: 'staff',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'creating' | 'success'>('form');
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { protectSession, unprotectSession } = useAuth();

  const handleInputChange = (field: keyof StaffData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear errors when user types
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    try {
      if (!validateForm()) return;

      setLoading(true);
      setError(null);
      setStep('creating');
      
      console.log('Starting staff creation process...');
      
      // Session korumasını aktive et
      protectSession();
      
      // Staff oluştur
      const result = await createStaffSecure(formData);
      
      console.log('Staff created successfully:', result);
      setStep('success');
      setSuccess(`${formData.fullName} has been created successfully!`);
      
      // Form'u temizle
      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: 'staff',
      });
      
      // 2 saniye sonra kapat
      setTimeout(() => {
        handleClose();
      }, 2000);
      
    } catch (err: any) {
      console.error('Error creating staff:', err);
      setError(err.message || 'An error occurred while creating staff member');
      setStep('form');
    } finally {
      setLoading(false);
      // Session protection'ı kapat
      unprotectSession();
    }
  };

  const handleClose = () => {
    if (loading) return; // Yükleme sırasında kapatmaya izin verme
    
    setFormData({
      fullName: '',
      email: '',
      password: '',
      role: 'staff',
    });
    setError(null);
    setSuccess(null);
    setStep('form');
    setShowPassword(false);
    onClose();
  };

  // Form validation
  const isFormValid = formData.fullName.trim() && 
                     formData.email.trim() && 
                     /\S+@\S+\.\S+/.test(formData.email) &&
                     formData.password && 
                     formData.password.length >= 6;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      fullWidth 
      maxWidth="sm"
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
        fontSize: { xs: '1.1rem', sm: '1.25rem' }
      }}>
        {step === 'success' ? 'Staff Member Created!' : 'Add New Staff Member'}
        {isMobile && !loading && (
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      
      <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
        {/* Success State */}
        {step === 'success' && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon 
              sx={{ 
                fontSize: 60, 
                color: 'success.main', 
                mb: 2 
              }} 
            />
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
            <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              This window will close automatically...
            </Box>
          </Box>
        )}

        {/* Loading State */}
        {step === 'creating' && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            py: 4,
            textAlign: 'center'
          }}>
            <CircularProgress size={50} sx={{ mb: 2 }} />
            <Box sx={{ fontWeight: 600, mb: 1, fontSize: '1.1rem' }}>
              Creating Staff Member...
            </Box>
            <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 2 }}>
              Please wait, preserving your session...
            </Box>
            <Alert severity="info" sx={{ mt: 1 }}>
              This process may take a few seconds. Please don't close this page.
            </Alert>
          </Box>
        )}

        {/* Form State */}
        {step === 'form' && (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            
            <Box sx={{ 
              mt: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: { xs: 2, sm: 2.5 }
            }}>
              <TextField
                label="Full Name"
                fullWidth
                required
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                disabled={loading}
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                error={!formData.fullName.trim() && formData.fullName !== ''}
                helperText={!formData.fullName.trim() && formData.fullName !== '' ? 'Full name is required' : ''}
                sx={{
                  '& .MuiInputLabel-root': {
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }
                }}
              />
              
              <TextField
                label="Email"
                type="email"
                fullWidth
                required
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={loading}
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                error={formData.email !== '' && !/\S+@\S+\.\S+/.test(formData.email)}
                helperText={
                  formData.email !== '' && !/\S+@\S+\.\S+/.test(formData.email) 
                    ? 'Please enter a valid email address' 
                    : ''
                }
                sx={{
                  '& .MuiInputLabel-root': {
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }
                }}
              />
              
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                required
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={loading}
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                error={formData.password !== '' && formData.password.length < 6}
                helperText={
                  formData.password !== '' && formData.password.length < 6 
                    ? 'Password must be at least 6 characters' 
                    : 'Choose a secure password'
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiInputLabel-root': {
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }
                }}
              />
              
              <TextField
                label="Role"
                select
                fullWidth
                required
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value as any)}
                disabled={loading}
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                helperText="Determines the user's permissions in the system"
                sx={{
                  '& .MuiInputLabel-root': {
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }
                }}
              >
                {roles.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option === 'admin' && 'Admin (Full Access)'}
                    {option === 'trainer' && 'Trainer (Class Management)'}
                    {option === 'staff' && 'Staff (Basic Permissions)'}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </>
        )}
      </DialogContent>
      
      {step === 'form' && (
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
            disabled={loading || !isFormValid}
            size={isMobile ? "medium" : "medium"}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Creating...' : 'Create Staff'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default StaffForm;