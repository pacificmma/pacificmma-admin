import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  useTheme,
  useMediaQuery,
  Avatar,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  handleDrawerToggle: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ handleDrawerToggle }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [userDisplayName, setUserDisplayName] = useState<string>('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // Display name varsa onu kullan, yoksa email'den isim çıkar
        if (user.displayName) {
          setUserDisplayName(user.displayName);
        } else if (user.email) {
          // Email'den @ işaretinden önceki kısmı al
          const emailName = user.email.split('@')[0];
          setUserDisplayName(emailName);
        } else {
          setUserDisplayName('User');
        }
      } else {
        setUserDisplayName('');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // İsmin ilk harfini avatar için al
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - 240px)` },
        ml: { md: '240px' },
        backgroundColor: theme.palette.primary.main,
        zIndex: theme.zIndex.drawer + 1,
      }}
      elevation={2}
    >
      <Toolbar sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        minHeight: { xs: 56, sm: 64 },
        px: { xs: 2, sm: 3 }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography 
            variant="h6" 
            noWrap 
            component="div"
            sx={{
              fontSize: { xs: '1rem', sm: '1.25rem' },
              fontWeight: 500,
            }}
          >
            Pacific MMA Admin Panel
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* User Info */}
          <Box sx={{ 
            alignItems: 'center', 
            gap: 1,
            display: { xs: 'none', sm: 'flex' } 
          }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                fontSize: '0.875rem',
              }}
            >
              {userDisplayName ? getInitials(userDisplayName) : <PersonIcon />}
            </Avatar>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'white',
                fontWeight: 500,
                maxWidth: 150,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {userDisplayName}
            </Typography>
          </Box>

          {/* Mobile'da sadece avatar göster */}
          <Box sx={{ 
            display: { xs: 'flex', sm: 'none' },
            alignItems: 'center',
          }}>
            <Avatar
              sx={{
                width: 28,
                height: 28,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                fontSize: '0.75rem',
              }}
            >
              {userDisplayName ? getInitials(userDisplayName) : <PersonIcon />}
            </Avatar>
          </Box>

          {/* Logout Button */}
          <IconButton 
            color="inherit" 
            onClick={handleLogout}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <LogoutIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;