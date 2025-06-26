// src/components/BeltLevelManagement.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  useMediaQuery,
  useTheme,
  IconButton,
  Alert,
  Typography,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Fab,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SchoolIcon from '@mui/icons-material/School';
import { 
  BeltLevel, 
  StudentLevel 
} from '../types/members';
import { 
  getAllBeltLevels, 
  getAllStudentLevels,
  createBeltLevel,
  createStudentLevel 
} from '../services/memberService';

interface BeltLevelManagementProps {
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`belt-level-tabpanel-${index}`}
      aria-labelledby={`belt-level-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const BeltLevelManagement: React.FC<BeltLevelManagementProps> = ({ open, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const [beltLevels, setBeltLevels] = useState<BeltLevel[]>([]);
  const [studentLevels, setStudentLevels] = useState<StudentLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [showBeltForm, setShowBeltForm] = useState(false);
  const [showLevelForm, setShowLevelForm] = useState(false);
  const [beltFormData, setBeltFormData] = useState({
    name: '',
    style: '',
    order: 0,
    color: '',
  });
  const [levelFormData, setLevelFormData] = useState({
    name: '',
    description: '',
    order: 0,
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const martialArtsStyles = [
    'BJJ', 'Muay Thai', 'Boxing', 'MMA', 'Judo', 'Karate', 
    'Taekwondo', 'Wrestling', 'Kickboxing', 'Jiu-Jitsu'
  ];

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading belt and student level data...');
      
      const [belts, levels] = await Promise.all([
        getAllBeltLevels(),
        getAllStudentLevels()
      ]);
      
      console.log('Loaded data:', { belts: belts.length, levels: levels.length });
      
      setBeltLevels(belts);
      setStudentLevels(levels);
    } catch (error: any) {
      console.error('Error loading belt/level data:', error);
      setError(error.message || 'Failed to load belt and level data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateBelt = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate required fields
      if (!beltFormData.name.trim()) {
        setError('Belt name is required');
        return;
      }
      if (!beltFormData.style.trim()) {
        setError('Martial arts style is required');
        return;
      }
      
      console.log('Creating belt with data:', beltFormData);
      
      await createBeltLevel({
        name: beltFormData.name.trim(),
        style: beltFormData.style.trim(),
        order: beltFormData.order,
        color: beltFormData.color.trim() || undefined,
      });
      
      console.log('Belt created successfully, reloading data...');
      
      await loadData();
      setShowBeltForm(false);
      setBeltFormData({ name: '', style: '', order: 0, color: '' });
      
      console.log('Belt creation process completed');
    } catch (error: any) {
      console.error('Error in handleCreateBelt:', error);
      setError(error.message || 'Failed to create belt level');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLevel = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate required fields
      if (!levelFormData.name.trim()) {
        setError('Student level name is required');
        return;
      }
      
      console.log('Creating student level with data:', levelFormData);
      
      await createStudentLevel({
        name: levelFormData.name.trim(),
        description: levelFormData.description?.trim() || undefined,
        order: levelFormData.order,
      });
      
      console.log('Student level created successfully, reloading data...');
      
      await loadData();
      setShowLevelForm(false);
      setLevelFormData({ name: '', description: '', order: 0 });
      
      console.log('Student level creation process completed');
    } catch (error: any) {
      console.error('Error in handleCreateLevel:', error);
      setError(error.message || 'Failed to create student level');
    } finally {
      setLoading(false);
    }
  };

  const getBeltColor = (color: string) => {
    const colorMap: Record<string, string> = {
      'white': '#FFFFFF',
      'blue': '#1976D2',
      'purple': '#7B1FA2',
      'brown': '#6D4C41',
      'black': '#000000',
      'red': '#D32F2F',
      'orange': '#FF9800',
      'yellow': '#FBC02D',
      'green': '#388E3C',
    };
    return colorMap[color.toLowerCase()] || color;
  };

  const renderBeltLevels = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Belt Levels</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowBeltForm(true)}
          size="small"
        >
          Add Belt Level
        </Button>
      </Box>

      {showBeltForm && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Add New Belt Level</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 2 }}>
            <TextField
              label="Belt Name"
              value={beltFormData.name}
              onChange={(e) => setBeltFormData(prev => ({ ...prev, name: e.target.value }))}
              size="small"
              placeholder="e.g., White Belt, Blue Belt"
            />
            <FormControl size="small">
              <InputLabel>Martial Arts Style</InputLabel>
              <Select
                value={beltFormData.style}
                label="Martial Arts Style"
                onChange={(e) => setBeltFormData(prev => ({ ...prev, style: e.target.value }))}
              >
                {martialArtsStyles.map(style => (
                  <MenuItem key={style} value={style}>{style}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Order"
              type="number"
              value={beltFormData.order}
              onChange={(e) => setBeltFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
              size="small"
              helperText="Lower numbers appear first"
            />
            <TextField
              label="Color (optional)"
              value={beltFormData.color}
              onChange={(e) => setBeltFormData(prev => ({ ...prev, color: e.target.value }))}
              size="small"
              placeholder="e.g., white, blue, black"
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              onClick={handleCreateBelt}
              disabled={!beltFormData.name.trim() || !beltFormData.style.trim() || loading}
              size="small"
            >
              {loading ? 'Creating Belt...' : 'Create Belt'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowBeltForm(false)}
              size="small"
            >
              Cancel
            </Button>
          </Box>
        </Paper>
      )}

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {beltLevels.map((belt) => (
            <Card key={belt.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {belt.color && (
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: getBeltColor(belt.color),
                          border: belt.color.toLowerCase() === 'white' ? '1px solid #ccc' : 'none',
                        }}
                      />
                    )}
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {belt.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {belt.style} • Order: {belt.order}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" color="primary">
                    <EditIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Belt Name</TableCell>
                <TableCell>Style</TableCell>
                <TableCell>Order</TableCell>
                <TableCell>Color</TableCell>
                <TableCell width={100}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {beltLevels.map((belt) => (
                <TableRow key={belt.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {belt.color && (
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            backgroundColor: getBeltColor(belt.color),
                            border: belt.color.toLowerCase() === 'white' ? '1px solid #ccc' : 'none',
                          }}
                        />
                      )}
                      {belt.name}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={belt.style} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{belt.order}</TableCell>
                  <TableCell>{belt.color || '-'}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary">
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {beltLevels.length === 0 && !loading && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No belt levels created yet. Add your first belt level to get started.
          </Typography>
        </Paper>
      )}
    </Box>
  );

  const renderStudentLevels = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Student Levels</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowLevelForm(true)}
          size="small"
        >
          Add Student Level
        </Button>
      </Box>

      {showLevelForm && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Add New Student Level</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 2 }}>
            <TextField
              label="Level Name"
              value={levelFormData.name}
              onChange={(e) => setLevelFormData(prev => ({ ...prev, name: e.target.value }))}
              size="small"
              placeholder="e.g., Beginner, Intermediate, Advanced"
            />
            <TextField
              label="Order"
              type="number"
              value={levelFormData.order}
              onChange={(e) => setLevelFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
              size="small"
              helperText="Lower numbers appear first"
            />
          </Box>
          <TextField
            label="Description (optional)"
            value={levelFormData.description}
            onChange={(e) => setLevelFormData(prev => ({ ...prev, description: e.target.value }))}
            size="small"
            fullWidth
            multiline
            rows={2}
            sx={{ mb: 2 }}
            placeholder="Describe this level..."
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              onClick={handleCreateLevel}
              disabled={!levelFormData.name.trim() || loading}
              size="small"
            >
              {loading ? 'Creating Level...' : 'Create Level'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowLevelForm(false)}
              size="small"
            >
              Cancel
            </Button>
          </Box>
        </Paper>
      )}

      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {studentLevels.map((level) => (
            <Card key={level.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {level.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Order: {level.order}
                    </Typography>
                    {level.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {level.description}
                      </Typography>
                    )}
                  </Box>
                  <IconButton size="small" color="primary">
                    <EditIcon />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Level Name</TableCell>
                <TableCell>Order</TableCell>
                <TableCell>Description</TableCell>
                <TableCell width={100}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {studentLevels.map((level) => (
                <TableRow key={level.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {level.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{level.order}</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {level.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary">
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {studentLevels.length === 0 && !loading && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No student levels created yet. Add your first student level to get started.
          </Typography>
        </Paper>
      )}
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': {
          margin: isMobile ? 0 : 2,
          width: isMobile ? '100%' : 'auto',
          maxHeight: isMobile ? '100%' : 'calc(100% - 64px)',
        },
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pb: 1,
      }}>
        Belt & Level Management
        {isMobile && (
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 }, pb: 0 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="belt level tabs">
            <Tab 
              icon={<EmojiEventsIcon />} 
              label="Belt Levels" 
              iconPosition="start"
              sx={{ gap: 1 }}
            />
            <Tab 
              icon={<SchoolIcon />} 
              label="Student Levels" 
              iconPosition="start"
              sx={{ gap: 1 }}
            />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          {renderBeltLevels()}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          {renderStudentLevels()}
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BeltLevelManagement;