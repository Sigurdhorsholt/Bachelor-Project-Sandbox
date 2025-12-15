// components/attendee/VotePanel.tsx
import React, { useState } from "react";
import { Box, Button, ToggleButton, ToggleButtonGroup, Typography, Alert, CircularProgress } from "@mui/material";
import { useSelector } from "react-redux";
import type { RootState } from "../../Redux/store";
import { useCastVoteMutation } from "../../Redux/voteApi";
import type {PropositionDto} from "../../domain/propositions.ts";
import type {VoteOptionDto} from "../../domain/voteOptions.ts";

/* ---------------- Props ---------------- */

type Props = {
    meetingId: string;
    proposition: PropositionDto;
    votationId?: string; // The open votation ID (undefined when closed)
    isOpen: boolean; // controlled by live state (SignalR) later
};

/* ---------------- Component ---------------- */

export const VotePanel: React.FC<Props> = ({ meetingId, proposition, votationId, isOpen }) => {
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const isYesNo = proposition.voteType === "YesNoBlank";
    
    // Get ticket code from Redux state
    const ticketCode = useSelector((state: RootState) => state.attendeeAuth.ticketCode);
    
    // RTK mutation for casting vote
    const [castVote, { isLoading, isSuccess, isError, error }] = useCastVoteMutation();

    const handlePick = (_: unknown, value: string | null): void => {
        if (!isOpen) { return; }
        setSelectedOptionId(value);
    };

    const handleCastVote = async (): Promise<void> => {
        if (!isOpen || !selectedOptionId || !votationId || !ticketCode) { 
            console.error("Missing required data for vote casting", {
                isOpen,
                selectedOptionId,
                votationId,
                ticketCode: ticketCode ? "present" : "missing"
            });
            return; 
        }

        try {
            
            const vote = {
                meetingId,
                propositionId: proposition.id,
                voteOptionId: selectedOptionId,
                code: ticketCode,
            }
            
            const result = await castVote(vote).unwrap();
        } catch (err) {
            console.error("Failed to cast vote:", err);
        }
    };

    return (
        <Box className="w-full">
            {/* Success message */}
            {isSuccess && (
                <Alert severity="success" className="mb-3">
                    Vote cast successfully!
                </Alert>
            )}

            {/* Error message */}
            {isError && (
                <Alert severity="error" className="mb-3">
                    {(error as any)?.data?.message || "Failed to cast vote. Please try again."}
                </Alert>
            )}

            <Box className="flex flex-col sm:flex-row sm:items-center gap-3">
                <ToggleButtonGroup
                    value={selectedOptionId}
                    exclusive
                    onChange={handlePick}
                    size="small"
                    color="primary"
                    aria-label="vote options"
                    disabled={!isOpen || isLoading}
                >
                    {proposition.voteOptions.map((opt) => (
                        <ToggleButton
                            key={opt.id}
                            value={opt.id}
                            aria-label={opt.label}
                            disabled={!isOpen || isLoading}
                            className="capitalize"
                        >
                            {opt.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>

                <Button
                    variant="contained"
                    onClick={handleCastVote}
                    disabled={!isOpen || !selectedOptionId || isLoading || !ticketCode}
                    startIcon={isLoading ? <CircularProgress size={20} /> : null}
                >
                    {isLoading ? "Casting..." : "Cast vote"}
                </Button>
            </Box>

            {!ticketCode && (
                <Alert severity="warning" className="mt-2">
                    No admission ticket found. Please log in again.
                </Alert>
            )}

            {!isOpen ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    Voting will open when the moderator starts this proposition.
                </Typography>
            ) : null}

            {isYesNo ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    Options include Yes, No, and Blank.
                </Typography>
            ) : null}
        </Box>
    );
};

/* ---------------- Helpers ---------------- */

const findOptionById = (options: VoteOptionDto[], id: string): VoteOptionDto | undefined => {
    return options.find((o) => o.id === id);
};
