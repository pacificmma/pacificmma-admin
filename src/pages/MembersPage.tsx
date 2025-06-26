// src/pages/MembersPage.tsx - Optimized with efficient data management

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Typography,
    Box,
    Container,
    Button,
    useTheme,
    useMediaQuery,
    Fab,
    Paper,
    SpeedDial,
    SpeedDialAction,
    Alert,
    Snackbar,
    CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import MemberTable from '../components/MemberTable';
import MemberForm from '../components/MemberForm';
import BeltLevelManagement from '../components/BeltLevelManagement';
import ProtectedComponent from '../components/ProtectedComponent';
import { useRoleControl } from '../hooks/useRoleControl';
import { MemberRecord } from '../types/members';
import { getMemberStats, clearMemberCache, getCacheStats } from '../services/memberService';

interface MemberStats {
    totalMembers: number;
    activeMembers: number;
    pausedMembers: number;
    overdueMembers: number;
    noMembershipCount: number;
    newThisMonth: number;
    recurringRevenue: number;
    prepaidRevenue: number;
}

const MembersPage = () => {
    const [openForm, setOpenForm] = useState(false);
    const [openBeltManagement, setOpenBeltManagement] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [editData, setEditData] = useState<MemberRecord | undefined>(undefined);
    const [memberList, setMemberList] = useState<MemberRecord[]>([]);
    const [speedDialOpen, setSpeedDialOpen] = useState(false);
    const [stats, setStats] = useState<MemberStats>({
        totalMembers: 0,
        activeMembers: 0,
        pausedMembers: 0,
        overdueMembers: 0,
        noMembershipCount: 0,
        newThisMonth: 0,
        recurringRevenue: 0,
        prepaidRevenue: 0,
    });
    const [statsLoading, setStatsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cacheInfo, setCacheInfo] = useState<any>(null);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { isAdmin } = useRoleControl();

    // Load stats efficiently
    const loadStats = useCallback(async (useCache = true) => {
        try {
            setStatsLoading(true);
            setError(null);
            
            const memberStats = await getMemberStats(useCache);
            setStats(memberStats);
            
            // Update cache info
            setCacheInfo(getCacheStats());
        } catch (err: any) {
            console.error('Error loading member stats:', err);
            setError('Failed to load member statistics');
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // Initial stats load
    useEffect(() => {
        loadStats();
    }, [loadStats]);

    // Handle data loaded from MemberTable - calculate stats from actual data
    const handleDataLoaded = useCallback(({ memberList }: { memberList: MemberRecord[] }) => {
        setMemberList(memberList);
        
        // Calculate real-time stats from loaded data
        const currentMonth = new Date();
        currentMonth.setDate(1);

        const calculatedStats = {
            totalMembers: memberList.length,
            activeMembers: 0,
            pausedMembers: 0,
            overdueMembers: 0,
            noMembershipCount: 0,
            newThisMonth: 0,
            recurringRevenue: 0,
            prepaidRevenue: 0,
        };

        memberList.forEach(member => {
            const membershipStatus = member?.membership?.status || 'No Membership';
            switch (membershipStatus) {
                case 'Active':
                    calculatedStats.activeMembers++;
                    break;
                case 'Paused':
                    calculatedStats.pausedMembers++;
                    break;
                case 'Overdue':
                    calculatedStats.overdueMembers++;
                    break;
                case 'No Membership':
                    calculatedStats.noMembershipCount++;
                    break;
            }

            // Count new members this month
            if (member.joinDate) {
                try {
                    const joinDate = member.joinDate.toDate();
                    if (joinDate >= currentMonth) {
                        calculatedStats.newThisMonth++;
                    }
                } catch (error) {
                    console.warn('Error parsing join date for member:', member.id);
                }
            }

            // Calculate revenue (only for active members)
            if (member?.membership?.status === 'Active') {
                if (member.membership.type === 'Recurring' && member.membership.monthlyAmount) {
                    calculatedStats.recurringRevenue += member.membership.monthlyAmount;
                }
            }
        });

        setStats(calculatedStats);
        setStatsLoading(false);
    }, []);

    const handleFormClose = useCallback(() => {
        setOpenForm(false);
        setEditData(undefined);
        // Trigger a refresh by changing the key prop
        setRefreshTrigger(prev => prev + 1);
        // Reload stats
        loadStats(false);
    }, [loadStats]);

    const handleBeltManagementClose = useCallback(() => {
        setOpenBeltManagement(false);
        // Trigger a refresh to update any belt/level data
        setRefreshTrigger(prev => prev + 1);
    }, []);

    const handleEdit = useCallback((memberData: MemberRecord) => {
        setEditData(memberData);
        setOpenForm(true);
    }, []);

    const handleAddNew = useCallback(() => {
        setEditData(undefined);
        setOpenForm(true);
        setSpeedDialOpen(false);
    }, []);

    const handleOpenBeltManagement = useCallback(() => {
        setOpenBeltManagement(true);
        setSpeedDialOpen(false);
    }, []);

    const handleClearCache = useCallback(() => {
        clearMemberCache();
        setCacheInfo(getCacheStats());
        setRefreshTrigger(prev => prev + 1);
        loadStats(false);
    }, [loadStats]);

    const speedDialActions = [
        {
            icon: <AddIcon />,
            name: 'Add Member',
            onClick: handleAddNew,
        },
        {
            icon: <EmojiEventsIcon />,
            name: 'Manage Belts & Levels',
            onClick: handleOpenBeltManagement,
        },
        ...(isAdmin ? [{
            icon: <RefreshIcon />,
            name: 'Clear Cache',
            onClick: handleClearCache,
        }] : []),
    ];

    // Auto-clear error message
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    return (
        <>
            <Container
                maxWidth="xl"
                sx={{
                    py: { xs: 2, sm: 3, md: 4 },
                    px: { xs: 2, sm: 3 }
                }}
            >
                {/* Error Snackbar */}
                <Snackbar
                    open={!!error}
                    autoHideDuration={5000}
                    onClose={() => setError(null)}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                >
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                </Snackbar>

                {/* Header Section */}
                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    justifyContent: 'space-between',
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    mb: { xs: 2, sm: 3 },
                    gap: { xs: 2, sm: 0 }
                }}>
                    <Box>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 700,
                                fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
                                color: 'text.primary',
                                mb: 0.5
                            }}
                        >
                            Members & Leads
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            {isAdmin ? 'Manage your gym members, leads, and guest registrations' : 'View member information and statistics'}
                        </Typography>
                        
                        {/* Cache Info for Admin */}
                        {isAdmin && cacheInfo && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                Cache: {cacheInfo.size} items • {cacheInfo.activeListeners} active listeners
                            </Typography>
                        )}
                    </Box>

                    {/* Desktop Buttons - Admin only */}
                    <ProtectedComponent allowedRoles={['admin']}>
                        {!isMobile && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<EmojiEventsIcon />}
                                    onClick={handleOpenBeltManagement}
                                    size="large"
                                    sx={{
                                        px: 2,
                                        py: 1.5,
                                        fontSize: '0.95rem',
                                        fontWeight: 600,
                                        borderRadius: 2,
                                    }}
                                >
                                    Belts & Levels
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={handleAddNew}
                                    size="large"
                                    sx={{
                                        px: 3,
                                        py: 1.5,
                                        fontSize: '0.95rem',
                                        fontWeight: 600,
                                        borderRadius: 2,
                                        boxShadow: 3,
                                        '&:hover': {
                                            boxShadow: 6,
                                        },
                                    }}
                                >
                                    Add Member
                                </Button>
                            </Box>
                        )}
                    </ProtectedComponent>
                </Box>

                {/* Stats Cards - Admin only */}
                <ProtectedComponent allowedRoles={['admin']}>
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(4, 1fr)'
                        },
                        gap: 2,
                        mb: 3
                    }}>
                        <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                                <GroupIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                            </Box>
                            {statsLoading ? (
                                <CircularProgress size={24} />
                            ) : (
                                <Typography variant="h4" color="primary" fontWeight="bold">
                                    {stats.totalMembers}
                                </Typography>
                            )}
                            <Typography variant="body2" color="text.secondary">
                                Total Members
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                                <CheckCircleIcon sx={{ fontSize: 32, color: 'success.main' }} />
                            </Box>
                            {statsLoading ? (
                                <CircularProgress size={24} />
                            ) : (
                                <Typography variant="h4" color="success.main" fontWeight="bold">
                                    {stats.activeMembers}
                                </Typography>
                            )}
                            <Typography variant="body2" color="text.secondary">
                                Active Members
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                                <AttachMoneyIcon sx={{ fontSize: 32, color: 'success.main' }} />
                            </Box>
                            {statsLoading ? (
                                <CircularProgress size={24} />
                            ) : (
                                <Typography variant="h4" color="success.main" fontWeight="bold">
                                    ${stats.recurringRevenue.toLocaleString()}
                                </Typography>
                            )}
                            <Typography variant="body2" color="text.secondary">
                                Monthly Recurring Revenue
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                                <TrendingUpIcon sx={{ fontSize: 32, color: 'warning.main' }} />
                            </Box>
                            {statsLoading ? (
                                <CircularProgress size={24} />
                            ) : (
                                <Typography variant="h4" color="warning.main" fontWeight="bold">
                                    {stats.newThisMonth}
                                </Typography>
                            )}
                            <Typography variant="body2" color="text.secondary">
                                New This Month
                            </Typography>
                        </Paper>
                    </Box>

                    {/* Secondary Stats */}
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',
                            sm: 'repeat(4, 1fr)'
                        },
                        gap: 2,
                        mb: 3
                    }}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                                <PauseCircleIcon sx={{ fontSize: 24, color: 'warning.main' }} />
                            </Box>
                            {statsLoading ? (
                                <CircularProgress size={20} />
                            ) : (
                                <Typography variant="h6" color="warning.main" fontWeight="bold">
                                    {stats.pausedMembers}
                                </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary">
                                Paused
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                                <ErrorIcon sx={{ fontSize: 24, color: 'error.main' }} />
                            </Box>
                            {statsLoading ? (
                                <CircularProgress size={20} />
                            ) : (
                                <Typography variant="h6" color="error.main" fontWeight="bold">
                                    {stats.overdueMembers}
                                </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary">
                                Overdue
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                                <PersonOffIcon sx={{ fontSize: 24, color: 'text.secondary' }} />
                            </Box>
                            {statsLoading ? (
                                <CircularProgress size={20} />
                            ) : (
                                <Typography variant="h6" color="text.secondary" fontWeight="bold">
                                    {stats.noMembershipCount}
                                </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary">
                                No Membership
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                            {statsLoading ? (
                                <CircularProgress size={20} />
                            ) : (
                                <Typography variant="h6" color="primary.main" fontWeight="bold">
                                    {stats.totalMembers > 0 ? Math.round((stats.activeMembers / stats.totalMembers) * 100) : 0}%
                                </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary">
                                Active Rate
                            </Typography>
                        </Paper>
                    </Box>
                </ProtectedComponent>

                {/* Members Table/Cards */}
                <Box sx={{
                    width: '100%',
                    overflow: 'hidden'
                }}>
                    <MemberTable
                        key={refreshTrigger}
                        refreshTrigger={refreshTrigger}
                        onEdit={handleEdit}
                        onDataLoaded={handleDataLoaded}
                    />
                </Box>
            </Container>

            {/* Mobile Speed Dial - Admin only */}
            <ProtectedComponent allowedRoles={['admin']}>
                {isMobile && (
                    <SpeedDial
                        ariaLabel="Member actions"
                        sx={{
                            position: 'fixed',
                            bottom: { xs: 24, sm: 32 },
                            right: { xs: 24, sm: 32 },
                            zIndex: theme.zIndex.speedDial,
                        }}
                        icon={<MoreVertIcon />}
                        open={speedDialOpen}
                        onOpen={() => setSpeedDialOpen(true)}
                        onClose={() => setSpeedDialOpen(false)}
                    >
                        {speedDialActions.map((action) => (
                            <SpeedDialAction
                                key={action.name}
                                icon={action.icon}
                                tooltipTitle={action.name}
                                onClick={action.onClick}
                            />
                        ))}
                    </SpeedDial>
                )}
            </ProtectedComponent>

            {/* Member Form Modal - Admin only */}
            <ProtectedComponent allowedRoles={['admin']}>
                <MemberForm
                    open={openForm}
                    onClose={handleFormClose}
                    editData={editData}
                />
            </ProtectedComponent>

            {/* Belt & Level Management Modal - Admin only */}
            <ProtectedComponent allowedRoles={['admin']}>
                <BeltLevelManagement
                    open={openBeltManagement}
                    onClose={handleBeltManagementClose}
                />
            </ProtectedComponent>
        </>
    );
};

export default MembersPage;