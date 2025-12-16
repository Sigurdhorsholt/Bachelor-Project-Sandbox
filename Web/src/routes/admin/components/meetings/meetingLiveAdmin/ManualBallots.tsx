import React, { useState } from "react";
import { 
    Box, 
    Button, 
    Card, 
    CardContent, 
    CardHeader, 
    Divider, 
    TextField, 
    Typography, 
    Alert, 
    Chip,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from "@mui/material";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAddManualBallotsMutation } from "../../../../../Redux/votationApi";
import type { PropositionDto } from "../../../../../domain/propositions";

type ManualBallotsProps = {
    proposition: PropositionDto | null;
    votationId: string | null;
    disabled?: boolean;
    onApply?: () => void;
};

export default function ManualBallots({ proposition, votationId, disabled, onApply }: ManualBallotsProps) {
    const [counts, setCounts] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState("");
    const [expanded, setExpanded] = useState(false);
    const [addManualBallots, { isLoading, isSuccess, isError, error }] = useAddManualBallotsMutation();

    // Initialize counts for all vote options
    React.useEffect(() => {
        if (proposition?.voteOptions) {
            const initialCounts: Record<string, string> = {};
            proposition.voteOptions.forEach((opt: any) => {
                initialCounts[opt.id] = "0";
            });
            setCounts(initialCounts);
        }
    }, [proposition]);

    const handleCountChange = (optionId: string, value: string) => {
        // Only allow non-negative integers
        if (value === "" || /^\d+$/.test(value)) {
            setCounts(prev => ({ ...prev, [optionId]: value }));
        }
    };

    const getTotalCount = () => {
        return Object.values(counts).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    };

    const handleSubmit = async () => {
        if (!votationId || !proposition) return;

        // Convert string counts to numbers
        const numericCounts: Record<string, number> = {};
        Object.entries(counts).forEach(([key, value]) => {
            const num = parseInt(value) || 0;
            if (num > 0) {
                numericCounts[key] = num;
            }
        });

        if (Object.keys(numericCounts).length === 0) {
            return; // No ballots to add
        }

        try {
            await addManualBallots({
                votationId,
                counts: numericCounts,
                notes: notes.trim() || undefined,
            }).unwrap();

            // Reset form
            const resetCounts: Record<string, string> = {};
            proposition.voteOptions?.forEach((opt: any) => {
                resetCounts[opt.id] = "0";
            });
            setCounts(resetCounts);
            setNotes("");

            if (onApply) {
                onApply();
            }
        } catch (err) {
            console.error("Failed to add manual ballots:", err);
        }
    };

    const canSubmit = !disabled && !isLoading && votationId && getTotalCount() > 0;

    if (!proposition) {
        return (
            <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)} elevation={1}>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{ 
                        bgcolor: (t) => t.palette.background.paper,
                        '&:hover': { bgcolor: (t) => t.palette.action.hover }
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <AddCircleOutlineIcon color="disabled" />
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>
                                Manual Ballot Entry
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Select a proposition to record paper ballots
                            </Typography>
                        </Box>
                    </Box>
                </AccordionSummary>
            </Accordion>
        );
    }

    return (
        <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)} elevation={1}>
            <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                    bgcolor: (t) => t.palette.background.paper,
                    '&:hover': { bgcolor: (t) => t.palette.action.hover }
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
                    <AddCircleOutlineIcon color={disabled ? "disabled" : "primary"} />
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700}>
                            Manual Ballot Entry
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Record paper ballots cast during the meeting
                        </Typography>
                    </Box>
                    {getTotalCount() > 0 && (
                        <Chip 
                            label={`${getTotalCount()} ready`} 
                            color="primary" 
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                    )}
                </Box>
            </AccordionSummary>
            <AccordionDetails>
                {isSuccess && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => {}}>
                        Manual ballots added successfully!
                    </Alert>
                )}

                {isError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {(error as any)?.data?.message || "Failed to add manual ballots. Please try again."}
                    </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Vote option inputs */}
                    {proposition.voteOptions && proposition.voteOptions.length > 0 ? (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                            {proposition.voteOptions.map((opt: any) => (
                                <TextField
                                    key={opt.id}
                                    label={opt.label}
                                    type="text"
                                    value={counts[opt.id] || "0"}
                                    onChange={(e) => handleCountChange(opt.id, e.target.value)}
                                    disabled={disabled || isLoading}
                                    size="small"
                                    slotProps={{ 
                                        input: {
                                            style: { textAlign: 'center', fontSize: '1.1rem', fontWeight: 600 }
                                        }
                                    }}
                                    sx={{
                                        '& .MuiInputBase-root': {
                                            bgcolor: (t) => t.palette.background.default,
                                        }
                                    }}
                                />
                            ))}
                        </Box>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            No vote options available for this proposition
                        </Typography>
                    )}

                    {/* Total preview */}
                    {getTotalCount() > 0 && (
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            p: 2, 
                            borderRadius: 1, 
                            bgcolor: (t) => t.palette.primary.light,
                            color: (t) => t.palette.primary.contrastText
                        }}>
                            <Typography variant="body1" fontWeight={700}>Total ballots to add:</Typography>
                            <Chip 
                                label={getTotalCount()} 
                                color="primary" 
                                size="medium"
                                sx={{ fontWeight: 700, fontSize: '1rem' }}
                            />
                        </Box>
                    )}

                    {/* Notes field */}
                    <TextField
                        label="Notes (optional)"
                        multiline
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={disabled || isLoading}
                        placeholder="Add any notes about these manual ballots..."
                        size="small"
                    />

                    {/* Submit button */}
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        fullWidth
                        size="large"
                    >
                        {isLoading ? "Adding Ballots..." : `Add ${getTotalCount()} Manual Ballot${getTotalCount() !== 1 ? 's' : ''}`}
                    </Button>
                </Box>
            </AccordionDetails>
        </Accordion>
    );
}
