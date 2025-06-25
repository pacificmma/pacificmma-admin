// src/pages/MySchedulePage.tsx
import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Container,
  Paper,
  Card,
  CardContent,
  Chip,
  useTheme,
  useMediaQuery,
  Alert,
  CircularProgress,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GroupIcon from '@mui/icons-material/Group';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { useRoleControl } from '../hooks/useRoleControl';
import { getAllClasses, ClassRecord } from '../services/classService';
import { format, isToday, isTomorrow, addDays, startOfWeek, endOfWeek } from 'date-fns';

const MySchedulePage = () => {
  const [myClasses, setMyClasses] = useState<ClassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userData } = useRoleControl();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const fetchMyClasses = async () => {
      if (!userData) return;
      
      try {
        setLoading(true);
        const allClasses = await getAllClasses();
        
        // Filter classes where user is the instructor
        const myInstructorClasses = allClasses.filter(
          classItem => classItem.instructorId === userData.uid
        );
        
        // Sort by date
        myInstructorClasses.sort((a, b) => {
          const dateA = a.date.toDate();
          const dateB = b.date.toDate();
          return dateA.getTime() - dateB.getTime();
        });
        
        setMyClasses(myInstructorClasses);
        setError(null);
      } catch (err) {
        console.error('Error loading my classes:', err);
        setError('Failed to load your schedule');
      } finally {
        setLoading(false);
      }
    };

    fetchMyClasses();
  }, [userData]);

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEEE, MMM dd');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'workshop':
        return 'secondary';
      case 'class':
        return 'primary';
      default:
        return 'default';
    }
  };

  const formatDateTime = (date: any) => {
    if (!date) return 'Invalid Date';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return format(dateObj, 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Group classes by date
  const groupedClasses = myClasses.reduce((groups, classItem) => {
    const date = classItem.date.toDate();
    const dateKey = format(date, 'yyyy-MM-dd');
    
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date,
        classes: []
      };
    }
    
    groups[dateKey].classes.push(classItem);
    return groups;
  }, {} as Record<string, { date: Date; classes: ClassRecord[] }>);

  // Get this week's stats
  const thisWeekStart = startOfWeek(new Date());
  const thisWeekEnd = endOfWeek(new Date());
  
  const thisWeekClasses = myClasses.filter(classItem => {
    const classDate = classItem.date.toDate();
    return classDate >= thisWeekStart && classDate <= thisWeekEnd;
  });

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700,
            fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
            color: 'text.primary',
            mb: 0.5
          }}
        >
          My Schedule
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back, {userData?.fullName}! Here are your upcoming classes and workshops.
        </Typography>
      </Box>

      {/* Weekly Stats */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 4
      }}>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h4" color="primary" fontWeight="bold">
            {thisWeekClasses.length}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Classes This Week
          </Typography>
        </Paper>
        
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h4" color="secondary" fontWeight="bold">
            {thisWeekClasses.reduce((sum, c) => sum + c.currentEnrollment, 0)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total Students
          </Typography>
        </Paper>
        
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h4" color="success.main" fontWeight="bold">
            {Math.round(thisWeekClasses.reduce((sum, c) => sum + (c.currentEnrollment / c.capacity), 0) / thisWeekClasses.length * 100) || 0}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Avg. Capacity
          </Typography>
        </Paper>
      </Box>

      {/* Schedule */}
      {Object.keys(groupedClasses).length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            You have no scheduled classes or workshops.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {Object.entries(groupedClasses)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([dateKey, { date, classes }]) => (
              <Box key={dateKey}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600, 
                    mb: 2,
                    color: 'primary.main'
                  }}
                >
                  {getDateLabel(date)}
                </Typography>
                
                <Box sx={{ 
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  gap: 2
                }}>
                  {classes.map((classItem) => (
                    <Card key={classItem.id} sx={{ elevation: 1 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography variant="h6" component="div" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                            {classItem.title}
                          </Typography>
                          <Chip
                            label={classItem.type.charAt(0).toUpperCase() + classItem.type.slice(1)}
                            color={getTypeColor(classItem.type) as any}
                            size="small"
                          />
                        </Box>
                        
                        {classItem.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {classItem.description.length > 80 
                              ? `${classItem.description.substring(0, 80)}...`
                              : classItem.description
                            }
                          </Typography>
                        )}

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <EventIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {classItem.startTime} - {classItem.endTime}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {classItem.location}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <GroupIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {classItem.currentEnrollment}/{classItem.capacity} enrolled
                              </Typography>
                            </Box>
                            
                            {classItem.price > 0 && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <AttachMoneyIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                <Typography variant="body2" color="success.main" fontWeight={600}>
                                  {classItem.price}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </Box>
            ))}
        </Box>
      )}
    </Container>
  );
};

export default MySchedulePage;