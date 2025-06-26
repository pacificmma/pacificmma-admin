// src/routes/ProtectedRoutes.tsx - Enhanced with member access control

import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Box, CircularProgress, Alert, Typography, Paper, Link } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

interface UserData {
  type: 'staff' | 'member';
  role: string;
  isActive: boolean;
  fullName?: string;
  firstName?: string;
  lastName?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUserAccess = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        console.log('Checking user access for:', user.uid);

        // First check if user is staff
        const staffDoc = await getDoc(doc(db, 'staff', user.uid));

        if (staffDoc.exists()) {
          const staffData = staffDoc.data();
          console.log('Found staff user:', staffData);

          // Check if staff member is active
          if (staffData.isActive === false) {
            setError('Your staff account has been deactivated. Please contact your administrator.');
            setLoading(false);
            return;
          }

          setUserData({
            type: 'staff',
            role: staffData.role,
            isActive: staffData.isActive,
            fullName: staffData.fullName,
          });
          setLoading(false);
          return;
        }

        // If not staff, check if user is a member/customer
        const memberProfileDoc = await getDoc(doc(db, 'memberProfiles', user.uid));

        if (memberProfileDoc.exists()) {
          const memberData = memberProfileDoc.data();
          console.log('Found member user:', memberData);

          // Members/customers should NOT have access to admin panel
          setError('Access denied. This is the admin panel. Please use the customer portal instead.');
          setLoading(false);
          return;
        }

        // User exists in Firebase Auth but not in our system
        console.log('User not found in staff or member collections');
        setError('User not found in system. Please contact your administrator.');
        setLoading(false);

      } catch (err: any) {
        console.error('Error checking user access:', err);
        setError('An error occurred while verifying your access. Please try again.');
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkUserAccess();
    }
  }, [user, authLoading]);

  // Show loading while checking authentication and user data
  if (authLoading || loading) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'background.default'
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
            Verifying access...
          </Typography>
        </Box>
      </Box>
    );
  }

  // No user authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Error occurred or access denied
  if (error) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        p: 3
      }}>
        <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" component="div" sx={{ mb: 1 }}>
              Access Denied
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>

          {error.includes('customer portal') && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
              <Typography variant="body2" color="info.main">
                <strong>Looking for the customer portal?</strong>
                <br />
                Please visit: <strong> <Link href="https://www.pacificmma.com" target="_blank" rel="noopener">
                  www.pacificmma.com
                </Link></strong>

              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              If you believe this is an error, please contact support.
            </Typography>
          </Box>
        </Paper>
      </Box>
    );
  }

  // User is staff and has access
  if (userData?.type === 'staff' && userData.isActive) {
    return <>{children}</>;
  }

  // Fallback - should not reach here
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;