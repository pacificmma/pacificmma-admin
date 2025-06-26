// src/components/DiscountForm.tsx

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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Checkbox,
    Divider,
    InputAdornment,
    Stepper,
    Step,
    StepLabel,
    Paper,
    Chip,
    Autocomplete,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PercentIcon from '@mui/icons-material/Percent';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EventIcon from '@mui/icons-material/Event';
import SettingsIcon from '@mui/icons-material/Settings';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { addDays, addWeeks, addMonths } from 'date-fns';
import {
    DiscountFormData,
    DiscountRecord,
    DiscountType,
    DiscountAppliesTo,
} from '../types/discount';
import { createDiscount, updateDiscount } from '../services/discountService';
import { getAllClasses, getAllPackages } from '../services/classService';
import { useAuth } from '../contexts/AuthContext';
import { useRoleControl } from '../hooks/useRoleControl';

interface DiscountFormProps {
    open: boolean;
    onClose: () => void;
    editData?: DiscountRecord | null;
}

const steps = ['Basic Info', 'Discount Details', 'Usage Limits', 'Advanced Settings'];

const quickDateOptions = [
    { label: 'No expiration', value: null },
    { label: '1 week', value: 7 },
    { label: '2 weeks', value: 14 },
    { label: '1 month', value: 30 },
    { label: '3 months', value: 90 },
    { label: '6 months', value: 180 },
    { label: '1 year', value: 365 },
];

const DiscountForm: React.FC<DiscountFormProps> = ({ open, onClose, editData }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState<DiscountFormData>({
        code: '',
        name: '',
        description: '',
        type: 'percentage',
        value: 10,
        startDate: new Date(),
        appliesTo: 'all',
        isActive: true,
    });

    const [availableItems, setAvailableItems] = useState<{ id: string; title: string; type: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const { user } = useAuth();
    const { userData } = useRoleControl();

    useEffect(() => {
        if (open) {
            loadAvailableItems();
            if (editData) {
                setFormData({
                    code: editData.code,
                    name: editData.name,
                    description: editData.description,
                    type: editData.type,
                    value: editData.value,
                    maxUses: editData.maxUses,
                    maxUsesPerUser: editData.maxUsesPerUser,
                    startDate: editData.startDate.toDate(),
                    endDate: editData.endDate?.toDate(),
                    appliesTo: editData.appliesTo,
                    specificItemIds: editData.specificItemIds,
                    minimumAmount: editData.minimumAmount,
                    isActive: editData.isActive,
                });
            } else {
                // Reset form for new discount
                setFormData({
                    code: '',
                    name: '',
                    description: '',
                    type: 'percentage',
                    value: 10,
                    startDate: new Date(),
                    appliesTo: 'all',
                    isActive: true,
                });
            }
            setActiveStep(0);
            setError(null);
        }
    }, [open, editData]);

    const loadAvailableItems = async () => {
        try {
            const [classes, packages] = await Promise.all([
                getAllClasses(),
                getAllPackages()
            ]);

            const items = [
                ...classes.map(c => ({ id: c.id, title: c.title, type: 'class' })),
                ...packages.map(p => ({ id: p.id, title: p.title, type: 'package' }))
            ];

            setAvailableItems(items);
        } catch (error) {
            console.error('Error loading available items:', error);
        }
    };

    const handleInputChange = (field: keyof DiscountFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (error) setError(null);
    };

    const handleQuickDate = (days: number | null) => {
        if (days === null) {
            handleInputChange('endDate', undefined);
        } else {
            handleInputChange('endDate', addDays(new Date(), days));
        }
    };

    const generateDiscountCode = () => {
        const prefixes = ['SAVE', 'OFF', 'DEAL', 'SPECIAL', 'PROMO'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = Math.floor(Math.random() * 900) + 100; // 3-digit number
        const code = `${prefix}${suffix}`;
        handleInputChange('code', code);
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 0: // Basic Info
                return !!(formData.code.trim() && formData.name.trim());
            case 1: // Discount Details
                return !!(formData.value > 0 &&
                    (formData.type !== 'percentage' || formData.value <= 100));
            case 2: // Usage Limits - always valid
                return true;
            case 3: // Advanced Settings
                if (formData.appliesTo === 'specific_items') {
                    return !!(formData.specificItemIds && formData.specificItemIds.length > 0);
                }
                return true;
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (validateStep(activeStep)) {
            setActiveStep(prev => prev + 1);
            setError(null);
        } else {
            setError('Please complete all required fields in this step.');
        }
    };

    const handleBack = () => {
        setActiveStep(prev => prev - 1);
        setError(null);
    };

    // DiscountForm.tsx - handleSubmit function fix

    const handleSubmit = async () => {
        if (!user || !userData) {
            setError('You must be logged in to create discounts.');
            return;
        }

        // Final validation
        if (!validateStep(3)) {
            setError('Please complete all required fields.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Clean form data to remove undefined values
            const cleanFormData: DiscountFormData = {
                code: formData.code,
                name: formData.name,
                type: formData.type,
                value: formData.value,
                startDate: formData.startDate,
                appliesTo: formData.appliesTo,
                isActive: formData.isActive,
            };

            // Only add optional fields if they have meaningful values
            if (formData.description && formData.description.trim()) {
                cleanFormData.description = formData.description;
            }

            if (formData.maxUses && formData.maxUses > 0) {
                cleanFormData.maxUses = formData.maxUses;
            }

            if (formData.maxUsesPerUser && formData.maxUsesPerUser > 0) {
                cleanFormData.maxUsesPerUser = formData.maxUsesPerUser;
            }

            if (formData.endDate) {
                cleanFormData.endDate = formData.endDate;
            }

            if (formData.specificItemIds && formData.specificItemIds.length > 0) {
                cleanFormData.specificItemIds = formData.specificItemIds;
            }

            if (formData.minimumAmount && formData.minimumAmount > 0) {
                cleanFormData.minimumAmount = formData.minimumAmount;
            }

            if (editData) {
                await updateDiscount(editData.id, cleanFormData, userData.uid);
            } else {
                await createDiscount(cleanFormData, userData.uid, userData.fullName);
            }

            handleClose();
        } catch (err: any) {
            console.error('Error saving discount:', err);
            setError(err.message || 'An error occurred while saving the discount');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setActiveStep(0);
        setError(null);
        onClose();
    };

    const renderStepContent = (step: number) => {
        switch (step) {
            case 0: // Basic Info
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <EventIcon color="primary" />
                            <Typography variant="h6">Basic Information</Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                            <TextField
                                label="Discount Code *"
                                value={formData.code}
                                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                                size="small"
                                sx={{ flex: 1 }}
                                error={!formData.code.trim() && formData.code !== ''}
                                helperText="Unique code customers will enter (e.g., SAVE20)"
                                inputProps={{ maxLength: 20 }}
                            />
                            <Button
                                variant="outlined"
                                onClick={generateDiscountCode}
                                size="small"
                                sx={{ mb: 2.5 }}
                            >
                                Generate
                            </Button>
                        </Box>

                        <TextField
                            label="Display Name *"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            size="small"
                            error={!formData.name.trim() && formData.name !== ''}
                            helperText="Friendly name for internal use (e.g., '20% Off Summer Classes')"
                        />

                        <TextField
                            label="Description"
                            multiline
                            rows={3}
                            value={formData.description || ''}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            size="small"
                            placeholder="Optional description for staff reference..."
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={formData.isActive}
                                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                                />
                            }
                            label="Active (users can use this discount)"
                        />
                    </Box>
                );

            case 1: // Discount Details
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <PercentIcon color="primary" />
                            <Typography variant="h6">Discount Details</Typography>
                        </Box>

                        <FormControl size="small">
                            <InputLabel>Discount Type *</InputLabel>
                            <Select
                                value={formData.type}
                                label="Discount Type *"
                                onChange={(e) => handleInputChange('type', e.target.value as DiscountType)}
                            >
                                <MenuItem value="percentage">Percentage Off</MenuItem>
                                <MenuItem value="fixed_amount">Fixed Amount Off</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            label={formData.type === 'percentage' ? 'Percentage *' : 'Amount *'}
                            type="number"
                            value={formData.value}
                            onChange={(e) => handleInputChange('value', parseFloat(e.target.value) || 0)}
                            size="small"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        {formData.type === 'percentage' ? <PercentIcon /> : <AttachMoneyIcon />}
                                    </InputAdornment>
                                ),
                                inputProps: {
                                    min: 0,
                                    max: formData.type === 'percentage' ? 100 : undefined,
                                    step: formData.type === 'percentage' ? 1 : 0.01
                                }
                            }}
                            error={formData.value <= 0 || (formData.type === 'percentage' && formData.value > 100)}
                            helperText={
                                formData.type === 'percentage'
                                    ? 'Enter percentage (1-100)'
                                    : 'Enter dollar amount'
                            }
                        />

                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Valid Dates
                            </Typography>

                            <DatePicker
                                label="Start Date *"
                                value={formData.startDate}
                                onChange={(newValue) => newValue && handleInputChange('startDate', newValue)}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        size: "small",
                                    },
                                }}
                                sx={{ mb: 2 }}
                            />

                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                Quick end date options:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                                {quickDateOptions.map((option) => (
                                    <Chip
                                        key={option.label}
                                        label={option.label}
                                        onClick={() => handleQuickDate(option.value)}
                                        variant={
                                            (option.value === null && !formData.endDate) ||
                                                (option.value && formData.endDate &&
                                                    Math.abs(formData.endDate.getTime() - addDays(new Date(), option.value).getTime()) < 24 * 60 * 60 * 1000)
                                                ? 'filled' : 'outlined'
                                        }
                                        size="small"
                                    />
                                ))}
                            </Box>

                            <DatePicker
                                label="End Date (Optional)"
                                value={formData.endDate || null}
                                onChange={(newValue) => handleInputChange('endDate', newValue)}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        size: "small",
                                    },
                                }}
                                minDate={formData.startDate}
                            />
                        </Box>
                    </Box>
                );

            case 2: // Usage Limits
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <SettingsIcon color="primary" />
                            <Typography variant="h6">Usage Limits</Typography>
                        </Box>

                        <TextField
                            label="Total Usage Limit"
                            type="number"
                            value={formData.maxUses || ''}
                            onChange={(e) => handleInputChange('maxUses', parseInt(e.target.value) || undefined)}
                            size="small"
                            InputProps={{ inputProps: { min: 1 } }}
                            helperText="Maximum total uses across all customers (leave empty for unlimited)"
                        />

                        <TextField
                            label="Per-User Usage Limit"
                            type="number"
                            value={formData.maxUsesPerUser || ''}
                            onChange={(e) => handleInputChange('maxUsesPerUser', parseInt(e.target.value) || undefined)}
                            size="small"
                            InputProps={{ inputProps: { min: 1 } }}
                            helperText="Maximum uses per customer (leave empty for unlimited)"
                        />

                        <TextField
                            label="Minimum Purchase Amount"
                            type="number"
                            value={formData.minimumAmount || ''}
                            onChange={(e) => handleInputChange('minimumAmount', parseFloat(e.target.value) || undefined)}
                            size="small"
                            InputProps={{
                                startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                inputProps: { min: 0, step: 0.01 }
                            }}
                            helperText="Minimum amount required to use this discount (leave empty for no minimum)"
                        />

                        {formData.maxUses && (
                            <Paper sx={{ p: 2, bgcolor: 'info.lighter' }}>
                                <Typography variant="body2" color="info.main">
                                    <strong>Usage Limit Preview:</strong><br />
                                    This discount can be used {formData.maxUses} time{formData.maxUses !== 1 ? 's' : ''} total
                                    {formData.maxUsesPerUser && `, with each customer limited to ${formData.maxUsesPerUser} use${formData.maxUsesPerUser !== 1 ? 's' : ''}`}.
                                </Typography>
                            </Paper>
                        )}
                    </Box>
                );

            case 3: // Advanced Settings
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <SettingsIcon color="primary" />
                            <Typography variant="h6">What This Discount Applies To</Typography>
                        </Box>

                        <FormControl size="small">
                            <InputLabel>Applies To *</InputLabel>
                            <Select
                                value={formData.appliesTo}
                                label="Applies To *"
                                onChange={(e) => handleInputChange('appliesTo', e.target.value as DiscountAppliesTo)}
                            >
                                <MenuItem value="all">All Classes, Workshops & Packages</MenuItem>
                                <MenuItem value="classes">Regular Classes Only</MenuItem>
                                <MenuItem value="workshops">Workshops Only</MenuItem>
                                <MenuItem value="packages">Packages Only</MenuItem>
                                <MenuItem value="specific_items">Specific Items Only</MenuItem>
                            </Select>
                        </FormControl>

                        {formData.appliesTo === 'specific_items' && (
                            <Autocomplete
                                multiple
                                options={availableItems}
                                getOptionLabel={(option) => `${option.title} (${option.type})`}
                                value={availableItems.filter(item => formData.specificItemIds?.includes(item.id)) || []}
                                onChange={(_, newValue) => {
                                    handleInputChange('specificItemIds', newValue.map(item => item.id));
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Select Specific Items *"
                                        size="small"
                                        error={formData.appliesTo === 'specific_items' && (!formData.specificItemIds || formData.specificItemIds.length === 0)}
                                        helperText="Choose which classes, workshops, or packages this discount applies to"
                                    />
                                )}
                                renderTags={(value, getTagProps) =>
                                    value.map((option, index) => (
                                        <Chip
                                            variant="outlined"
                                            label={`${option.title} (${option.type})`}
                                            size="small"
                                            {...getTagProps({ index })}
                                        />
                                    ))
                                }
                                ChipProps={{ size: 'small' }}
                            />
                        )}

                        <Paper sx={{ p: 2, bgcolor: 'success.lighter' }}>
                            <Typography variant="body2" color="success.main">
                                <strong>Discount Summary:</strong><br />
                                Code: <strong>{formData.code || '[CODE]'}</strong><br />
                                {formData.type === 'percentage'
                                    ? `${formData.value}% off`
                                    : `${formData.value} off`
                                } {formData.appliesTo === 'all' ? 'everything' : formData.appliesTo}
                                {formData.minimumAmount && ` (minimum ${formData.minimumAmount})`}
                                <br />
                                Valid from {formData.startDate.toLocaleDateString()}
                                {formData.endDate && ` to ${formData.endDate.toLocaleDateString()}`}
                            </Typography>
                        </Paper>
                    </Box>
                );

            default:
                return null;
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Dialog
                open={open}
                onClose={handleClose}
                fullWidth
                maxWidth="md"
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
                    {editData ? 'Edit Discount Code' : 'Create New Discount Code'}
                    {isMobile && (
                        <IconButton onClick={handleClose} size="small" disabled={loading}>
                            <CloseIcon />
                        </IconButton>
                    )}
                </DialogTitle>

                <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                            {error}
                        </Alert>
                    )}

                    {/* Stepper */}
                    <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {/* Step Content */}
                    {renderStepContent(activeStep)}
                </DialogContent>

                <DialogActions sx={{
                    px: { xs: 2, sm: 3 },
                    pb: { xs: 2, sm: 3 },
                    pt: 1,
                    gap: 1,
                    flexDirection: { xs: 'column', sm: 'row' },
                    '& .MuiButton-root': {
                        width: { xs: '100%', sm: 'auto' },
                        minWidth: { sm: 80 }
                    }
                }}>
                    <Button
                        onClick={handleClose}
                        disabled={loading}
                        variant="outlined"
                    >
                        Cancel
                    </Button>

                    {activeStep > 0 && (
                        <Button
                            onClick={handleBack}
                            disabled={loading}
                            variant="outlined"
                        >
                            Back
                        </Button>
                    )}

                    {activeStep < steps.length - 1 ? (
                        <Button
                            onClick={handleNext}
                            variant="contained"
                            disabled={!validateStep(activeStep)}
                        >
                            Next
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            variant="contained"
                            disabled={loading || !validateStep(activeStep)}
                        >
                            {loading ? (editData ? 'Updating...' : 'Creating...') : (editData ? 'Update Discount' : 'Create Discount')}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </LocalizationProvider>
    );
};

export default DiscountForm;