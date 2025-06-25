import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Container,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Firebase Auth ile giriş yap
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Kullanıcının Firestore'daki durumunu kontrol et
      const userDoc = await getDoc(doc(db, 'staff', user.uid));
      
      if (!userDoc.exists()) {
        // Kullanıcı Firestore'da yok
        await signOut(auth);
        setError('User not found in system. Please contact your administrator.');
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      
      if (userData.isActive === false) {
        // Kullanıcı deaktif
        await signOut(auth);
        setError('Your account has been deactivated. Please contact your administrator.');
        setLoading(false);
        return;
      }

      // 3. Her şey tamam, dashboard'a yönlendir
      navigate('/classes');
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Firebase Auth hatalarını kullanıcı dostu mesajlara çevir
      let errorMessage = 'Login failed';
      
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 2, sm: 4 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={isMobile ? 1 : 3}
          sx={{
            p: { xs: 3, sm: 4 },
            width: '100%',
            maxWidth: { xs: '100%', sm: 400 },
            mx: 'auto',
            borderRadius: { xs: 1, sm: 2 },
          }}
        >
          <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 4 } }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 600,
                fontSize: { xs: '1.5rem', sm: '2rem' },
                mb: 1,
                color: 'primary.main'
              }}
            >
              PACIFIC MMA
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 400,
                fontSize: { xs: '1rem', sm: '1.25rem' },
                color: 'text.secondary'
              }}
            >
              Admin Login
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleLogin}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: { xs: 2, sm: 2.5 } }}
              variant="outlined"
              size={isMobile ? "medium" : "medium"}
              autoComplete="email"
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: { xs: 2, sm: 2.5 } }}
              variant="outlined"
              size={isMobile ? "medium" : "medium"}
              autoComplete="current-password"
            />

            {error && (
              <Box sx={{ mb: 2, p: 2, backgroundColor: 'error.lighter', borderRadius: 1 }}>
                <Typography color="error" variant="body2" sx={{ fontSize: '0.875rem' }}>
                  {error}
                </Typography>
              </Box>
            )}

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading}
              sx={{
                py: { xs: 1.5, sm: 1.75 },
                fontSize: { xs: '0.95rem', sm: '1rem' },
                fontWeight: 600,
                borderRadius: 1,
                '&:disabled': {
                  backgroundColor: 'action.disabledBackground',
                },
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  <span>Signing In...</span>
                </Box>
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>

          {/* Optional: Add forgot password link */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Having trouble signing in? Contact your administrator.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;