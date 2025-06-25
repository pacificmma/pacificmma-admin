import React, { useState } from 'react';
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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { createStaff } from '../services/staffService';

interface StaffFormProps {
  open: boolean;
  onClose: () => void;
}

const roles = ['admin', 'trainer', 'staff'];

const StaffForm = ({ open, onClose }: StaffFormProps) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'admin' | 'trainer' | 'staff'>('trainer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSubmit = async () => {
    // Basic validation
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Staff oluşturma fonksiyonunu kullan
      await createStaff({ fullName, email, password, role });
      onClose();
      // Form verilerini temizle
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('trainer');
      setError(null);
    } catch (err: any) {
      console.error('Error creating staff:', err);
      
      // Firebase Auth error kodlarını kontrol et
      let errorMessage = 'An error occurred while creating user';
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('trainer');
    setError(null);
  };

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
          mt: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: { xs: 2, sm: 2.5 }
        }}>
          <TextField
            label="Full Name"
            fullWidth
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            variant="outlined"
            size={isMobile ? "small" : "medium"}
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            variant="outlined"
            size={isMobile ? "small" : "medium"}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            variant="outlined"
            size={isMobile ? "small" : "medium"}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    size="small"
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
            select
            label="Role"
            fullWidth
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'trainer' | 'staff')}
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
          {loading ? 'Creating User...' : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StaffForm;