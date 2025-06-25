import React from 'react';
import {
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    useTheme,
    Box,
    Toolbar,
    useMediaQuery,
    IconButton,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import GroupIcon from '@mui/icons-material/Group';
import DiscountIcon from '@mui/icons-material/Sell';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate, useLocation } from 'react-router-dom';
import ListItemButton from '@mui/material/ListItemButton';
import { Button } from '@mui/material';
import SportsMartialArtsIcon from '@mui/icons-material/SportsMartialArts';

const drawerWidth = 240;

const menuItems = [
    { text: 'Classes', icon: <FitnessCenterIcon />, path: '/classes' },
    { text: 'Members', icon: <GroupIcon />, path: '/members' },
    { text: 'Discounts', icon: <DiscountIcon />, path: '/discounts' },
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Staff', icon: <SportsMartialArtsIcon />, path: '/staff' },
];

interface SidebarProps {
    mobileOpen: boolean;
    handleDrawerToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, handleDrawerToggle }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const handleNavigation = (path: string) => {
        navigate(path);
        if (isMobile) {
            handleDrawerToggle();
        }
    };

    const drawerContent = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Toolbar sx={{ justifyContent: 'center', py: 2, px: 1 }}>
                <Button
                    variant="text"
                    onClick={() => window.open('/', '_blank')}
                    sx={{
                        fontSize: { xs: 14, sm: 16 },
                        fontWeight: 'bold',
                        color: theme.palette.text.primary,
                        textAlign: 'center',
                        minWidth: 0,
                        px: 1,
                        '&:hover': {
                            backgroundColor: 'transparent',
                            textDecoration: 'underline',
                        },
                    }}
                >
                    PACIFIC MMA
                </Button>
            </Toolbar>
            <Box sx={{ overflow: 'auto', flex: 1 }}>
                <List sx={{ px: 1 }}>
                    {menuItems.map(({ text, icon, path }) => (
                        <ListItem key={text} disablePadding sx={{ mb: 0.5 }}>
                            <ListItemButton
                                selected={location.pathname === path}
                                onClick={() => handleNavigation(path)}
                                sx={{
                                    borderRadius: 1,
                                    minHeight: 48,
                                    '&.Mui-selected': {
                                        backgroundColor: theme.palette.primary.main,
                                        color: theme.palette.primary.contrastText,
                                        '& .MuiListItemIcon-root': {
                                            color: theme.palette.primary.contrastText,
                                        },
                                        '&:hover': {
                                            backgroundColor: theme.palette.primary.dark,
                                        },
                                    },
                                }}
                            >
                                <ListItemIcon
                                    sx={{
                                        minWidth: 40,
                                        justifyContent: 'center',
                                    }}
                                >
                                    {icon}
                                </ListItemIcon>
                                <ListItemText 
                                    primary={text}
                                    primaryTypographyProps={{
                                        fontSize: { xs: 14, sm: 16 },
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>
        </Box>
    );

    return (
        <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
            {/* Mobile drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true,
                }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                        backgroundColor: theme.palette.background.default,
                    },
                }}
            >
                {drawerContent}
            </Drawer>
            
            {/* Desktop drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                        backgroundColor: theme.palette.background.default,
                    },
                }}
                open
            >
                {drawerContent}
            </Drawer>
        </Box>
    );
};

export default Sidebar;