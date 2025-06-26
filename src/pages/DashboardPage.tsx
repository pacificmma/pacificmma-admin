// src/pages/DashboardPage.tsx - CSS Grid ile düzeltilmiş versiyon
import React, { useState, useEffect, useMemo } from 'react';
import {
  Typography,
  Box,
  Container,
  Paper,
  CircularProgress,
  Alert,
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
import { getMemberStats } from '../services/memberService';
import { getAllDiscounts } from '../services/discountService';
import { format, isToday, isTomorrow, addDays, startOfWeek, endOfWeek } from 'date-fns';

interface DashboardStats {
  totalClasses: number;
  totalPackages: number;
  upcomingClasses: number;
  todayClasses: number;
  weeklyClasses: number;
  totalEnrollment: number;
  avgCapacityUtilization: number;
  memberStats: any;
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

      // Load all data with proper error handling
      const results = await Promise.allSettled([
        getAllClasses(),
        getAllPackages(),
        getMemberStats(),
        getAllDiscounts(),
      ]);

      const [classesResult, packagesResult, memberStatsResult, discountsResult] = results;

      // Extract data or use defaults
      const classes = classesResult.status === 'fulfilled' ? classesResult.value : [];
      const packages = packagesResult.status === 'fulfilled' ? packagesResult.value : [];
      const memberStats = memberStatsResult.status === 'fulfilled' ? memberStatsResult.value : {
        totalMembers: 0,
        activeMembers: 0,
        pausedMembers: 0,
        overdueMembers: 0,
        noMembershipCount: 0,
        newThisMonth: 0,
        recurringRevenue: 0,
        prepaidRevenue: 0,
      };
      const discounts = discountsResult.status === 'fulfilled' ? discountsResult.value : [];

      console.log('Dashboard data loaded:', {
        classes: classes.length,
        packages: packages.length,
        memberStats,
        discounts: discounts.length,
      });

      // Calculate class statistics safely
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);

      // Filter upcoming classes (not past)
      const upcomingClasses = classes.filter(c => {
        try {
          return c.date && c.date.toDate() >= today;
        } catch (error) {
          console.warn('Invalid date in class:', c.id);
          return false;
        }
      });

      const todayClasses = classes.filter(c => {
        try {
          return c.date && isToday(c.date.toDate());
        } catch (error) {
          console.warn('Invalid date in class:', c.id);
          return false;
        }
      });

      const weeklyClasses = classes.filter(c => {
        try {
          if (!c.date) return false;
          const classDate = c.date.toDate();
          return classDate >= weekStart && classDate <= weekEnd;
        } catch (error) {
          console.warn('Invalid date in class:', c.id);
          return false;
        }
      });

      // Calculate enrollment and capacity safely
      const totalEnrollment = classes.reduce((sum, c) => {
        return sum + (typeof c.currentEnrollment === 'number' ? c.currentEnrollment : 0);
      }, 0);

      const totalCapacity = classes.reduce((sum, c) => {
        return sum + (typeof c.capacity === 'number' ? c.capacity : 0);
      }, 0);

      const avgCapacityUtilization = totalCapacity > 0 ? Math.round((totalEnrollment / totalCapacity) * 100) : 0;

      // Package session enrollment safely
      const packageSessionEnrollment = packages.reduce((total, pkg) => {
        if (!Array.isArray(pkg.sessions)) return total;
        return total + pkg.sessions.reduce((sum, session) => {
          return sum + (typeof session.currentEnrollment === 'number' ? session.currentEnrollment : 0);
        }, 0);
      }, 0);

      // Active discounts safely
      const activeDiscounts = discounts.filter(d => {
        try {
          return d.status === 'Active' && d.isActive;
        } catch (error) {
          console.warn('Invalid discount data:', d.id);
          return false;
        }
      }).length;

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
        monthlyRecurringRevenue: memberStats.recurringRevenue || 0,
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

  // Quick stats for overview - with safe access
  const quickStats = useMemo(() => {
    if (!stats) return [];

    return [
      {
        title: 'Active Members',
        value: stats.memberStats?.activeMembers || 0,
        total: stats.memberStats?.totalMembers || 0,
        icon: <GroupIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
        color: 'primary.main',
        subtitle: `${stats.memberStats?.totalMembers || 0} total members`,
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
        value: `$${(stats.monthlyRecurringRevenue || 0).toLocaleString()}`,
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

  // Secondary metrics - with safe access
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
        value: stats.memberStats?.newThisMonth || 0,
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
      showFallback={true}
      fallbackComponent={
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

        {/* Main Stats Grid - CSS Grid ile düzeltilmiş */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, 
          gap: 3,
          mb: 4 
        }}>
          {quickStats.map((stat, index) => (
            <Card key={index} sx={{ height: '100%', border: 1, borderColor: 'divider' }}>
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
          ))}
        </Box>

        {/* Secondary Metrics */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Quick Metrics
          </Typography>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }, 
            gap: 3 
          }}>
            {secondaryMetrics.map((metric, index) => (
              <Box key={index} sx={{ 
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
            ))}
          </Box>
        </Paper>

        {/* Member Status Breakdown */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, 
          gap: 3,
          mb: 4 
        }}>
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
                  {stats?.memberStats?.activeMembers || 0}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label="Paused" color="warning" size="small" />
                  <Typography variant="body2">Paused Members</Typography>
                </Box>
                <Typography variant="h6" color="warning.main" fontWeight="bold">
                  {stats?.memberStats?.pausedMembers || 0}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label="Overdue" color="error" size="small" />
                  <Typography variant="body2">Overdue Members</Typography>
                </Box>
                <Typography variant="h6" color="error.main" fontWeight="bold">
                  {stats?.memberStats?.overdueMembers || 0}
                </Typography>
              </Box>
              
              <Divider />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" fontWeight={600}>
                  Total Members
                </Typography>
                <Typography variant="h5" color="primary.main" fontWeight="bold">
                  {stats?.memberStats?.totalMembers || 0}
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              System Overview
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Individual Classes</Typography>
                <Typography variant="h6" fontWeight="bold">
                  {stats?.totalClasses || 0}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Class Packages</Typography>
                <Typography variant="h6" fontWeight="bold">
                  {stats?.totalPackages || 0}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Upcoming Classes</Typography>
                <Typography variant="h6" fontWeight="bold">
                  {stats?.upcomingClasses || 0}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Active Discounts</Typography>
                <Typography variant="h6" fontWeight="bold">
                  {stats?.activeDiscounts || 0}
                </Typography>
              </Box>
              
              <Divider />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" fontWeight={600}>
                  Total Enrollment
                </Typography>
                <Typography variant="h5" color="secondary.main" fontWeight="bold">
                  {stats?.totalEnrollment || 0}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>

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