import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
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
        
        <Box>
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