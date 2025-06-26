// src/pages/DashboardPage.tsx - Updated with real data integration
import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Box,
  Container,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  Button,
} from '@mui/material';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import GroupIcon from '@mui/icons-material/Group';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import RefreshIcon from '@mui/icons-material/Refresh';
import ProtectedComponent from '../components/ProtectedComponent';
import { useRoleControl } from '../hooks/useRoleControl';
import { getAllClasses, getAllPackages, ClassRecord, PackageRecord } from '../services/classService';
import { getMemberStats, MemberStats } from '../services/memberService';
import { getAllDiscounts, DiscountRecord } from '../services/discountService';
import { format, isToday, isTomorrow, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

interface DashboardStats {
  totalClasses: number;
  totalPackages: number;
  upcomingClasses: number;
  todayClasses: number;
  weeklyClasses: number;
  totalEnrollment: number;
  avgCapacityUtilization: number;
  memberStats: MemberStats;
  activeDiscounts: number;
  totalDiscounts: number;
  monthlyRecurringRevenue: number;
}

const DashboardPage = () => {
  const { userData } = useRoleControl();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading dashboard data...');

      // Load all data in parallel
      const [classes, packages, memberStats, discounts] = await Promise.all([
        getAllClasses(),
        getAllPackages(),
        getMemberStats(),
        getAllDiscounts(),
      ]);

      console.log('Dashboard data loaded:', {
        classes: classes.length,
        packages: packages.length,
        memberStats,
        discounts: discounts.length,
      });

      // Calculate class statistics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = addDays(today, 1);
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);

      // Filter upcoming classes (not past)
      const upcomingClasses = classes.filter(c => c.date.toDate() >= today);
      const todayClasses = classes.filter(c => {
        const classDate = c.date.toDate();
        return isToday(classDate);
      });

      const weeklyClasses = classes.filter(c => {
        const classDate = c.date.toDate();
        return classDate >= weekStart && classDate <= weekEnd;
      });

      // Calculate enrollment and capacity
      const totalEnrollment = classes.reduce((sum, c) => sum + (c.currentEnrollment || 0), 0);
      const totalCapacity = classes.reduce((sum, c) => sum + (c.capacity || 0), 0);
      const avgCapacityUtilization = totalCapacity > 0 ? Math.round((totalEnrollment / totalCapacity) * 100) : 0;

      // Package session enrollment
      const packageSessionEnrollment = packages.reduce((total, pkg) => {
        return total + (pkg.sessions?.reduce((sum: number, session: any) => sum + (session.currentEnrollment || 0), 0) || 0);
      }, 0);

      // Active discounts
      const activeDiscounts = discounts.filter(d => d.status === 'Active' && d.isActive).length;

      const dashboardStats: DashboardStats = {
        totalClasses: classes.length,
        totalPackages: packages.length,
        upcomingClasses: upcomingClasses.length,
        todayClasses: todayClasses.length,
        weeklyClasses: weeklyClasses.length,
        totalEnrollment: totalEnrollment + packageSessionEnrollment,
        avgCapacityUtilization,
        memberStats,
        activeDiscounts,
        totalDiscounts: discounts.length,
        monthlyRecurringRevenue: memberStats.recurringRevenue,
      };

      setStats(dashboardStats);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Auto refresh every 5 minutes
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    loadDashboardData();
  };

  // Quick stats for overview
  const quickStats = useMemo(() => {
    if (!stats) return [];

    return [
      {
        title: 'Active Members',
        value: stats.memberStats.activeMembers,
        total: stats.memberStats.totalMembers,
        icon: <GroupIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
        color: 'primary.main',
        subtitle: `${stats.memberStats.totalMembers} total members`,
      },
      {
        title: 'Classes This Week',
        value: stats.weeklyClasses,
        total: stats.totalClasses + stats.totalPackages,
        icon: <FitnessCenterIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
        color: 'secondary.main',
        subtitle: `${stats.totalClasses + stats.totalPackages} total classes`,
      },
      {
        title: 'Monthly Revenue',
        value: `$${stats.monthlyRecurringRevenue.toLocaleString()}`,
        icon: <AttachMoneyIcon sx={{ fontSize: 40, color: 'success.main' }} />,
        color: 'success.main',
        subtitle: 'Recurring subscriptions',
      },
      {
        title: 'Capacity Utilization',
        value: `${stats.avgCapacityUtilization}%`,
        icon: <TrendingUpIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
        color: 'warning.main',
        subtitle: 'Average class capacity',
      },
    ];
  }, [stats]);

  // Secondary metrics
  const secondaryMetrics = useMemo(() => {
    if (!stats) return [];

    return [
      {
        label: 'Today\'s Classes',
        value: stats.todayClasses,
        icon: <CalendarTodayIcon />,
      },
      {
        label: 'Active Discounts',
        value: stats.activeDiscounts,
        icon: <LocalOfferIcon />,
      },
      {
        label: 'New Members This Month',
        value: stats.memberStats.newThisMonth,
        icon: <PersonIcon />,
      },
      {
        label: 'Total Enrollment',
        value: stats.totalEnrollment,
        icon: <EmojiEventsIcon />,
      },
    ];
  }, [stats]);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress size={60} />
          <Typography sx={{ ml: 2 }}>Loading dashboard...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <ProtectedComponent 
      allowedRoles={['admin']}
      fallback={
        <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="text.secondary" sx={{ mb: 2 }}>
            Access Restricted
          </Typography>
          <Typography variant="body1" color="text.secondary">
            The dashboard is only available to administrators.
          </Typography>
        </Container>
      }
    >
      <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4 
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
              Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Welcome back, {userData?.fullName}! Here's your gym overview.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Last updated: {format(lastUpdated, 'MMM dd, yyyy • HH:mm')}
            </Typography>
          </Box>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
            size="small"
          >
            Refresh
          </Button>
        </Box>

        {/* Main Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {quickStats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ height: '100%', border: 1, borderColor: 'divider' }}>
                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    {stat.icon}
                  </Box>
                  <Typography variant="h4" sx={{ color: stat.color, fontWeight: 'bold', mb: 1 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="h6" color="text.primary" sx={{ mb: 1 }}>
                    {stat.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stat.subtitle}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Secondary Metrics */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Quick Metrics
          </Typography>
          <Grid container spacing={3}>
            {secondaryMetrics.map((metric, index) => (
              <Grid item xs={6} sm={3} key={index}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  p: 2, 
                  bgcolor: 'grey.50', 
                  borderRadius: 1,
                  textAlign: 'center',
                  flexDirection: 'column',
                  gap: 1,
                }}>
                  <Box sx={{ color: 'primary.main' }}>
                    {metric.icon}
                  </Box>
                  <Typography variant="h6" color="primary" fontWeight="bold">
                    {metric.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" textAlign="center">
                    {metric.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Member Status Breakdown */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Member Status Breakdown
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="Active" color="success" size="small" />
                    <Typography variant="body2">Active Members</Typography>
                  </Box>
                  <Typography variant="h6" color="success.main" fontWeight="bold">
                    {stats?.memberStats.activeMembers}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="Paused" color="warning" size="small" />
                    <Typography variant="body2">Paused Members</Typography>
                  </Box>
                  <Typography variant="h6" color="warning.main" fontWeight="bold">
                    {stats?.memberStats.pausedMembers}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label="Overdue" color="error" size="small" />
                    <Typography variant="body2">Overdue Members</Typography>
                  </Box>
                  <Typography variant="h6" color="error.main" fontWeight="bold">
                    {stats?.memberStats.overdueMembers}
                  </Typography>
                </Box>
                
                <Divider />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" fontWeight={600}>
                    Total Members
                  </Typography>
                  <Typography variant="h5" color="primary.main" fontWeight="bold">
                    {stats?.memberStats.totalMembers}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                System Overview
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Individual Classes</Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {stats?.totalClasses}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Class Packages</Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {stats?.totalPackages}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Upcoming Classes</Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {stats?.upcomingClasses}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Active Discounts</Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {stats?.activeDiscounts}
                  </Typography>
                </Box>
                
                <Divider />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body1" fontWeight={600}>
                    Total Enrollment
                  </Typography>
                  <Typography variant="h5" color="secondary.main" fontWeight="bold">
                    {stats?.totalEnrollment}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Quick Actions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Use the navigation menu to:
            <br />• Manage classes and workshops
            <br />• Add new members and track their progress
            <br />• Create and manage discount codes
            <br />• Add new staff members and manage permissions
            <br />• Monitor member activity and financial metrics
          </Typography>
        </Paper>
      </Container>
    </ProtectedComponent>
  );
};

export default DashboardPage;