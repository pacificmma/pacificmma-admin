// src/pages/MembersPage.tsx - Fixed Grid Import

import React, { useState, useMemo } from 'react';
import {
    Typography,
    Box,
    Container,
    Button,
    useTheme,
    useMediaQuery,
    Fab,
    Paper,
} from '@mui/material';
import { Grid } from '@mui/material'; // This way instead
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MemberTable from '../components/MemberTable';
import MemberForm from '../components/MemberForm';
import ProtectedComponent from '../components/ProtectedComponent';
import { useRoleControl } from '../hooks/useRoleControl';
import { MemberRecord, MemberStats } from '../types/members';

const MembersPage = () => {
    const [openForm, setOpenForm] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [editData, setEditData] = useState<MemberRecord | undefined>(undefined);
    const [memberList, setMemberList] = useState<MemberRecord[]>([]);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { isAdmin } = useRoleControl();

    // Calculate real stats from data
    const stats = useMemo(() => {
        if (memberList.length === 0) {
            return {
                totalMembers: 0,
                activeMembers: 0,
                pausedMembers: 0,
                overdueMembers: 0,
                noMembershipCount: 0,
                newThisMonth: 0,
                recurringRevenue: 0,
                prepaidRevenue: 0,
            };
        }

        const currentMonth = new Date();
        currentMonth.setDate(1); // First day of current month

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
                const joinDate = member.joinDate.toDate();
                if (joinDate >= currentMonth) {
                    calculatedStats.newThisMonth++;
                }
            }

            // Calculate revenue (only for active members)
            if (member?.membership?.status === 'Active') {
                if (member.membership.type === 'Recurring' && member.membership.monthlyAmount) {
                    calculatedStats.recurringRevenue += member.membership.monthlyAmount;
                } else if (member.membership.type === 'Prepaid' && member.membership.totalAmount) {
                    // For prepaid, we don't add to monthly recurring revenue
                    // but we could track it separately if needed
                }
            }
        });

        return calculatedStats;
    }, [memberList]);

    // Handle data loaded from MemberTable
    const handleDataLoaded = ({ memberList }: { memberList: MemberRecord[] }) => {
        setMemberList(memberList);
    };

    const handleFormClose = () => {
        setOpenForm(false);
        setEditData(undefined);
        // Trigger a refresh by changing the key prop
        setRefreshTrigger(prev => prev + 1);
    };

    const handleEdit = (memberData: MemberRecord) => {
        setEditData(memberData);
        setOpenForm(true);
    };

    const handleAddNew = () => {
        setEditData(undefined);
        setOpenForm(true);
    };

    return (
        <>
            <Container
                maxWidth="xl"
                sx={{
                    py: { xs: 2, sm: 3, md: 4 },
                    px: { xs: 2, sm: 3 }
                }}
            >
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
                    </Box>

                    {/* Desktop Add Button - Sadece admin için */}
                    <ProtectedComponent allowedRoles={['admin']}>
                        {!isMobile && (
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
                        )}
                    </ProtectedComponent>
                </Box>

                {/* Stats Cards - Sadece admin için */}
                <ProtectedComponent allowedRoles={['admin']}>
                    {/* Use CSS Grid instead of MUI Grid to avoid TypeScript issues */}
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
                            <Typography variant="h4" color="primary" fontWeight="bold">
                                {stats.totalMembers}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total Members
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                                <CheckCircleIcon sx={{ fontSize: 32, color: 'success.main' }} />
                            </Box>
                            <Typography variant="h4" color="success.main" fontWeight="bold">
                                {stats.activeMembers}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Active Members
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                                <AttachMoneyIcon sx={{ fontSize: 32, color: 'success.main' }} />
                            </Box>
                            <Typography variant="h4" color="success.main" fontWeight="bold">
                                ${stats.recurringRevenue.toLocaleString()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Monthly Recurring Revenue
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                                <TrendingUpIcon sx={{ fontSize: 32, color: 'warning.main' }} />
                            </Box>
                            <Typography variant="h4" color="warning.main" fontWeight="bold">
                                {stats.newThisMonth}
                            </Typography>
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
                            <Typography variant="h6" color="warning.main" fontWeight="bold">
                                {stats.pausedMembers}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Paused
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                                <ErrorIcon sx={{ fontSize: 24, color: 'error.main' }} />
                            </Box>
                            <Typography variant="h6" color="error.main" fontWeight="bold">
                                {stats.overdueMembers}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Overdue
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                                <PersonOffIcon sx={{ fontSize: 24, color: 'text.secondary' }} />
                            </Box>
                            <Typography variant="h6" color="text.secondary" fontWeight="bold">
                                {stats.noMembershipCount}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                No Membership
                            </Typography>
                        </Paper>

                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="h6" color="primary.main" fontWeight="bold">
                                {stats.totalMembers > 0 ? Math.round((stats.activeMembers / stats.totalMembers) * 100) : 0}%
                            </Typography>
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

            {/* Mobile Floating Action Button - Sadece admin için */}
            <ProtectedComponent allowedRoles={['admin']}>
                {isMobile && (
                    <Fab
                        color="primary"
                        aria-label="add member"
                        onClick={handleAddNew}
                        sx={{
                            position: 'fixed',
                            bottom: { xs: 24, sm: 32 },
                            right: { xs: 24, sm: 32 },
                            zIndex: theme.zIndex.speedDial,
                            boxShadow: 6,
                            '&:hover': {
                                boxShadow: 12,
                            },
                        }}
                    >
                        <AddIcon />
                    </Fab>
                )}
            </ProtectedComponent>

            {/* Member Form Modal - Sadece admin için */}
            <ProtectedComponent allowedRoles={['admin']}>
                <MemberForm
                    open={openForm}
                    onClose={handleFormClose}
                    editData={editData}
                />
            </ProtectedComponent>
        </>
    );
};

export default MembersPage;