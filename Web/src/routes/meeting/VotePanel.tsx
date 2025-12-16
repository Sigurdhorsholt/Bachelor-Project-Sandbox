// components/attendee/VotePanel.tsx
// Renders voting options and handles vote casting. Reads ticketCode from Redux.

import React, { useState } from "react";
import { Box, Button, ToggleButton, ToggleButtonGroup, Typography, Alert, CircularProgress } from "@mui/material";
import { useSelector } from "react-redux";
import type { RootState } from "../../Redux/store";
import { useCastVoteMutation } from "../../Redux/voteApi";
import type { PropositionDto } from "../../domain/propositions";

/* ---------------- Props ---------------- */

type Props = {
    meetingId: string;
    proposition: PropositionDto;
    votationId?: string;
    isOpen: boolean;
};

/* ---------------- Component ---------------- */

export const VotePanel: React.FC<Props> = ({ meetingId, proposition, votationId, isOpen }) => {
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const ticketCode = useSelector((state: RootState) => state.attendeeAuth.ticketCode);
    const [castVote, { isLoading, isSuccess, isError, error }] = useCastVoteMutation();

    const handlePick = (_: unknown, value: string | null): void => {
        if (!isOpen) return;
        setSelectedOptionId(value);
    };

    const handleCastVote = async (): Promise<void> => {
        if (!isOpen || !selectedOptionId || !votationId || !ticketCode) {
            console.error("Missing required data for vote casting", {
                isOpen,
                selectedOptionId,
                votationId,
                ticketCode: ticketCode ? "present" : "missing",
            });
            return;
        }

        try {
            const vote = {
                meetingId,
                propositionId: proposition.id,
                voteOptionId: selectedOptionId,
                code: ticketCode,
            };
            await castVote(vote).unwrap();
        } catch (err) {
            console.error("Failed to cast vote:", err);
        }
    };

    return (
        <Box className="w-full space-y-3">
            {/* Success message */}
            {isSuccess && (
                <Alert severity="success" className="rounded-lg">
                    Din stemme er registreret!
                </Alert>
            )}

            {/* Error message */}
            {isError && (
                <Alert severity="error" className="rounded-lg">
                    {(error as any)?.data?.message || "Kunne ikke afgive stemme. Prøv igen."}
                </Alert>
            )}

            {/* Warning if no ticket */}
            {!ticketCode && (
                <Alert severity="warning" className="rounded-lg">
                    Ingen adgangsbillet fundet. Log venligst ind igen.
                </Alert>
            )}

            {/* Vote options and submit button */}
            <Box className="flex flex-col sm:flex-row sm:items-center gap-3">
                <ToggleButtonGroup
                    value={selectedOptionId}
                    exclusive
                    onChange={handlePick}
                    size="medium"
                    color="primary"
                    aria-label="stemme muligheder"
                    disabled={!isOpen || isLoading}
                    className="flex-wrap"
                >
                    {proposition.voteOptions.map((opt) => (
                        <ToggleButton
                            key={opt.id}
                            value={opt.id}
                            aria-label={opt.label}
                            disabled={!isOpen || isLoading}
                            className="capitalize min-w-[80px]"
                            sx={{ fontWeight: 600 }}
                        >
                            {opt.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>

                <Button
                    variant="contained"
                    onClick={handleCastVote}
                    disabled={!isOpen || !selectedOptionId || isLoading || !ticketCode}
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
                    className="rounded-lg"
                    size="large"
                    sx={{ minWidth: 140, fontWeight: 700 }}
                >
                    {isLoading ? "Afgiver..." : "Afgiv stemme"}
                </Button>
            </Box>

            {/* Help text */}
            {!isOpen && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    Afstemningen åbner når mødestyrer starter dette forslag.
                </Typography>
            )}
        </Box>
    );
};
