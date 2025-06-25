import React, { useState } from 'react';
import {
  Typography,
  Box,
  Container,
  Button,
  useTheme,
  useMediaQuery,
  Fab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import StaffTable from '../components/StaffTable';
import StaffForm from '../components/StaffForm';

const StaffPage = () => {
  const [openForm, setOpenForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleFormClose = () => {
    setOpenForm(false);
    // Trigger a refresh by changing the key prop
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <>
      <Container 
        maxWidth="lg" 
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
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '1.75rem', sm: '2rem', md: '2.125rem' },
              color: 'text.primary'
            }}
          >
            Staff Management
          </Typography>
          
          {/* Desktop Add Button */}
          {!isMobile && (
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => setOpenForm(true)}
              sx={{
                px: 3,
                py: 1,
                fontSize: '0.95rem',
                fontWeight: 600,
                borderRadius: 2,
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 4,
                },
              }}
            >
              Add New Staff
            </Button>
          )}
        </Box>

        {/* Staff Table/Cards */}
        <Box sx={{ 
          width: '100%',
          overflow: 'hidden'
        }}>
          <StaffTable key={refreshTrigger} />
        </Box>
      </Container>

      {/* Mobile Floating Action Button */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="add staff"
          onClick={() => setOpenForm(true)}
          sx={{
            position: 'fixed',
            bottom: { xs: 24, sm: 32 },
            right: { xs: 24, sm: 32 },
            zIndex: theme.zIndex.speedDial,
            boxShadow: 4,
            '&:hover': {
              boxShadow: 8,
            },
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Staff Form Modal */}
      <StaffForm open={openForm} onClose={handleFormClose} />
    </>
  );
};

export default StaffPage;