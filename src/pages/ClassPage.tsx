import React, { useState } from 'react';
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
import ClassTable from '../components/ClassTable';
import ClassForm from '../components/ClassForm';

const ClassesPage = () => {
  const [openForm, setOpenForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editData, setEditData] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
              Manage your fitness classes and special workshops
            </Typography>
          </Box>
          
          {/* Desktop Add Button */}
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
              icon={<FitnessCenterIcon />} 
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

        {/* Stats Cards */}
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
              24
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Classes
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="secondary" fontWeight="bold">
              8
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Workshops
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main" fontWeight="bold">
              156
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Enrollment
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main" fontWeight="bold">
              85%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Avg. Capacity
            </Typography>
          </Paper>
        </Box>

        {/* Classes Table/Cards */}
        <Box sx={{ 
          width: '100%',
          overflow: 'hidden'
        }}>
          <ClassTable 
            key={refreshTrigger} 
            refreshTrigger={refreshTrigger}
            onEdit={handleEdit}
          />
        </Box>
      </Container>

      {/* Mobile Floating Action Button */}
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

      {/* Class/Workshop Form Modal */}
      <ClassForm 
        open={openForm} 
        onClose={handleFormClose}
        editData={editData}
      />
    </>
  );
};

export default ClassesPage;