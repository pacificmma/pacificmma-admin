import React, { useState, useMemo } from 'react';
import {
  Typography,
  Box,
  Container,
  Button,
  useTheme,
  useMediaQuery,
  Fab,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import WorkshopIcon from '@mui/icons-material/School';
import ViewListIcon from '@mui/icons-material/ViewList';
import ClassTable from '../components/ClassTable';
import ClassForm from '../components/ClassForm';
import ProtectedComponent from '../components/ProtectedComponent';
import { useRoleControl } from '../hooks/useRoleControl';
import { ClassRecord, PackageRecord } from '../services/classService';

const ClassesPage = () => {
  const [openForm, setOpenForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editData, setEditData] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [classFilter, setClassFilter] = useState<'all' | 'class' | 'workshop'>('all');
  const [classList, setClassList] = useState<ClassRecord[]>([]);
  const [packageList, setPackageList] = useState<PackageRecord[]>([]);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { canCreateClasses, isAdmin } = useRoleControl();

  // Handle data loaded from ClassTable
  const handleDataLoaded = ({ classList, packageList }: { classList: ClassRecord[], packageList: PackageRecord[] }) => {
    setClassList(classList);
    setPackageList(packageList);
  };

  // Calculate real stats from data
  const stats = useMemo(() => {
    // Count individual classes (not package sessions)
    const individualClasses = classList.filter(c => !c.isPackage);
    const regularClasses = individualClasses.filter(c => c.type === 'class');
    const workshops = individualClasses.filter(c => c.type === 'workshop');
    
    // Calculate total enrollment for individual classes
    const individualEnrollment = individualClasses.reduce((sum, c) => sum + (c.currentEnrollment || 0), 0);
    
    // Calculate package sessions enrollment
    const packageEnrollment = packageList.reduce((total, pkg) => {
      return total + (pkg.sessions?.reduce((sum: number, session: any) => sum + (session.currentEnrollment || 0), 0) || 0);
    }, 0);
    
    const totalEnrollment = individualEnrollment + packageEnrollment;
    
    // Calculate total capacity
    const individualCapacity = individualClasses.reduce((sum, c) => sum + (c.capacity || 0), 0);
    const packageCapacity = packageList.reduce((total, pkg) => {
      return total + (pkg.sessions?.reduce((sum: number, session: any) => sum + (session.capacity || 0), 0) || 0);
    }, 0);
    
    const totalCapacity = individualCapacity + packageCapacity;
    const avgCapacityPercentage = totalCapacity > 0 ? Math.round((totalEnrollment / totalCapacity) * 100) : 0;
    
    return {
      totalClasses: individualClasses.length + packageList.length,
      regularClasses: regularClasses.length,
      workshops: workshops.length + packageList.filter(p => p.type === 'workshop').length,
      totalEnrollment,
      avgCapacityPercentage
    };
  }, [classList, packageList]);

  const handleFormClose = () => {
    setOpenForm(false);
    setEditData(null);
    // Trigger a refresh by changing the key prop
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEdit = (classData: any) => {
    setEditData(classData);
    setOpenForm(true);
  };

  const handleAddNew = () => {
    setEditData(null);
    setOpenForm(true);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    
    // Set filter based on tab
    switch (newValue) {
      case 0:
        setClassFilter('all');
        break;
      case 1:
        setClassFilter('class');
        break;
      case 2:
        setClassFilter('workshop');
        break;
      default:
        setClassFilter('all');
    }
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
              Classes & Workshops
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {isAdmin ? 'Manage your fitness classes and special workshops' : 'View available classes and workshops'}
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
                Add Class/Workshop
              </Button>
            )}
          </ProtectedComponent>
        </Box>

        {/* Filter Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            sx={{ 
              '& .MuiTab-root': {
                minHeight: 60,
                textTransform: 'none',
                fontSize: '0.95rem',
                fontWeight: 600,
              }
            }}
          >
            <Tab 
              icon={<ViewListIcon />} 
              label="All Classes & Workshops" 
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab 
              icon={<FitnessCenterIcon />} 
              label="Regular Classes" 
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab 
              icon={<WorkshopIcon />} 
              label="Workshops" 
              iconPosition="start"
              sx={{ gap: 1 }}
            />
          </Tabs>
        </Paper>

        {/* Real Stats Cards - Sadece admin için */}
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
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {stats.totalClasses}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Classes & Packages
              </Typography>
            </Paper>
            
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="secondary" fontWeight="bold">
                {stats.workshops}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Workshops
              </Typography>
            </Paper>
            
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {stats.totalEnrollment}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Enrollment
              </Typography>
            </Paper>
            
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {stats.avgCapacityPercentage}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg. Capacity
              </Typography>
            </Paper>
          </Box>
        </ProtectedComponent>

        {/* Classes Table/Cards with Filter */}
        <Box sx={{ 
          width: '100%',
          overflow: 'hidden'
        }}>
          <ClassTable 
            key={refreshTrigger} 
            refreshTrigger={refreshTrigger}
            onEdit={handleEdit}
            filter={classFilter}
            onDataLoaded={handleDataLoaded}
          />
        </Box>
      </Container>

      {/* Mobile Floating Action Button - Sadece admin için */}
      <ProtectedComponent allowedRoles={['admin']}>
        {isMobile && (
          <Fab
            color="primary"
            aria-label="add class"
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

      {/* Class/Workshop Form Modal - Sadece admin için */}
      <ProtectedComponent allowedRoles={['admin']}>
        <ClassForm 
          open={openForm} 
          onClose={handleFormClose}
          editData={editData}
        />
      </ProtectedComponent>
    </>
  );
};

export default ClassesPage;