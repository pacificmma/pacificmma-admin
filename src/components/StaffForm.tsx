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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
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
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { protectSession, unprotectSession, user } = useAuth();

  const handleInputChange = (field: keyof StaffData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Validation
      if (!formData.fullName.trim()) {
        setError('Full name is required');
        return;
      }
      if (!formData.email.trim()) {
        setError('Email is required');
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      // Session korumasını aktive et
      console.log('Protecting admin session before creating staff...');
      protectSession();
      
      // Kısa bir delay ekle (session protection'ın aktif olması için)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Staff oluştur
      const result = await createStaffSecure(formData);
      
      console.log('Staff created successfully:', result);
      setSuccess('Staff member created successfully!');
      
      // Form'u temizle
      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: 'staff',
      });
      
      // Başarı mesajını göster ve sonra kapat
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1500);
      
    } catch (err: any) {
      console.error('Error creating staff:', err);
      setError(err.message || 'An error occurred while creating staff');
    } finally {
      setLoading(false);
      // Session protection'ı kapat
      console.log('Unprotecting admin session...');
      unprotectSession();
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        fullName: '',
        email: '',
        password: '',
        role: 'staff',
      });
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  // Form validation
  const isFormValid = formData.fullName.trim() && 
                     formData.email.trim() && 
                     formData.password && 
                     formData.password.length >= 6;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      fullWidth 
      maxWidth="sm"
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
        Add New Staff Member
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
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
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
            error={!formData.email.trim() && formData.email !== ''}
            helperText={!formData.email.trim() && formData.email !== '' ? 'Email is required' : ''}
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
            helperText={formData.password !== '' && formData.password.length < 6 ? 'Password must be at least 6 characters' : ''}
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
            sx={{
              '& .MuiInputLabel-root': {
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }
            }}
          >
            {roles.map((option) => (
              <MenuItem key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {loading && (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mt: 2,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ fontWeight: 600, mb: 0.5 }}>Creating Staff Member...</Box>
              <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                Please wait, maintaining your session...
              </Box>
            </Box>
          </Box>
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
    </Dialog>
  );
};

export default StaffForm;