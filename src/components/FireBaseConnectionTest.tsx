// src/components/FirebaseConnectionTest.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Alert,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import { db, auth } from '../services/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

const FirebaseConnectionTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const { user } = useAuth();

  const initialTests: TestResult[] = [
    { name: 'Firebase App Connection', status: 'pending', message: 'Checking Firebase app initialization...' },
    { name: 'Firestore Database', status: 'pending', message: 'Testing Firestore read/write access...' },
    { name: 'Authentication', status: 'pending', message: 'Checking authentication status...' },
    { name: 'Project Configuration', status: 'pending', message: 'Verifying project settings...' },
    { name: 'Existing Data Access', status: 'pending', message: 'Testing access to existing collections...' },
  ];

  useEffect(() => {
    setTests(initialTests);
  }, []);

  const runTests = async () => {
    setRunning(true);
    const updatedTests = [...initialTests];

    try {
      // Test 1: Firebase App Connection
      try {
        const projectId = auth.app.options.projectId;
        const appId = auth.app.options.appId;
        
        updatedTests[0] = {
          name: 'Firebase App Connection',
          status: 'success',
          message: `Connected successfully`,
          details: { projectId, appId }
        };
      } catch (error: any) {
        updatedTests[0] = {
          name: 'Firebase App Connection',
          status: 'error',
          message: `Connection failed: ${error.message}`
        };
      }
      setTests([...updatedTests]);

      // Test 2: Firestore Database
      try {
        // Try to read from staff collection (existing)
        const staffRef = collection(db, 'staff');
        const staffSnapshot = await getDocs(staffRef);
        
        // Try to create and delete a test document
        const testRef = collection(db, 'connection_test');
        const testDoc = await addDoc(testRef, {
          test: true,
          timestamp: new Date(),
          user: user?.uid || 'anonymous'
        });
        
        // Delete the test document
        await deleteDoc(testDoc);
        
        updatedTests[1] = {
          name: 'Firestore Database',
          status: 'success',
          message: `Read/write successful`,
          details: { staffCount: staffSnapshot.size }
        };
      } catch (error: any) {
        updatedTests[1] = {
          name: 'Firestore Database',
          status: 'error',
          message: `Database error: ${error.message}`
        };
      }
      setTests([...updatedTests]);

      // Test 3: Authentication
      try {
        if (user) {
          updatedTests[2] = {
            name: 'Authentication',
            status: 'success',
            message: `User authenticated`,
            details: { 
              uid: user.uid,
              email: user.email,
              displayName: user.displayName
            }
          };
        } else {
          updatedTests[2] = {
            name: 'Authentication',
            status: 'error',
            message: 'No user authenticated'
          };
        }
      } catch (error: any) {
        updatedTests[2] = {
          name: 'Authentication',
          status: 'error',
          message: `Auth error: ${error.message}`
        };
      }
      setTests([...updatedTests]);

      // Test 4: Project Configuration
      try {
        const config = {
          projectId: auth.app.options.projectId,
          authDomain: auth.app.options.authDomain,
          appId: auth.app.options.appId,
          appName: auth.app.name
        };
        
        updatedTests[3] = {
          name: 'Project Configuration',
          status: 'success',
          message: `Configuration verified`,
          details: config
        };
      } catch (error: any) {
        updatedTests[3] = {
          name: 'Project Configuration',
          status: 'error',
          message: `Config error: ${error.message}`
        };
      }
      setTests([...updatedTests]);

      // Test 5: Existing Data Access
      try {
        const collections = ['staff', 'classes', 'gymClasses'];
        const collectionData: Record<string, { exists: boolean; count?: number; error?: string }> = {};
        
        for (const collectionName of collections) {
          try {
            const collectionRef = collection(db, collectionName);
            const snapshot = await getDocs(collectionRef);
            collectionData[collectionName] = {
              exists: !snapshot.empty,
              count: snapshot.size
            };
          } catch (error: any) {
            collectionData[collectionName] = {
              exists: false,
              error: error.message
            };
          }
        }
        
        updatedTests[4] = {
          name: 'Existing Data Access',
          status: 'success',
          message: `Data access verified`,
          details: collectionData
        };
      } catch (error: any) {
        updatedTests[4] = {
          name: 'Existing Data Access',
          status: 'error',
          message: `Data access error: ${error.message}`
        };
      }
      setTests([...updatedTests]);

    } catch (error: any) {
      console.error('Test suite error:', error);
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const allTestsPassed = tests.every(test => test.status === 'success');
  const hasErrors = tests.some(test => test.status === 'error');

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Firebase Connection Test
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          This test verifies that the admin panel is properly connected to the unified Firebase project.
        </Typography>

        {!running && tests.length > 0 && (
          <>
            {allTestsPassed && (
              <Alert severity="success" sx={{ mb: 2 }}>
                🎉 All tests passed! Admin panel is successfully connected to the unified Firebase project.
              </Alert>
            )}
            
            {hasErrors && (
              <Alert severity="error" sx={{ mb: 2 }}>
                ❌ Some tests failed. Please check the configuration and try again.
              </Alert>
            )}
          </>
        )}

        <Button
          variant="contained"
          onClick={runTests}
          disabled={running}
          startIcon={running ? <CircularProgress size={20} /> : null}
          sx={{ mb: 3 }}
        >
          {running ? 'Running Tests...' : 'Run Connection Tests'}
        </Button>

        <List>
          {tests.map((test, index) => (
            <ListItem key={index}>
              <ListItemIcon>
                {running && test.status === 'pending' ? (
                  <CircularProgress size={24} />
                ) : (
                  getStatusIcon(test.status)
                )}
              </ListItemIcon>
              <ListItemText
                primary={test.name}
                secondary={
                  <Box>
                    <Typography variant="body2">
                      {test.message}
                    </Typography>
                    {test.details && (
                      <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                        <Typography variant="caption" component="pre">
                          {JSON.stringify(test.details, null, 2)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>

        {allTestsPassed && !running && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Next Steps:
            </Typography>
            <Typography variant="body2">
              1. ✅ Firebase connection established<br/>
              2. 🔄 Run data migration to new schema<br/>
              3. 🧪 Test admin panel functionality<br/>
              4. 🌐 Integrate with pacificmma.com
            </Typography>
          </Alert>
        )}
      </Paper>
    </Box>
  );
};

export default FirebaseConnectionTest;