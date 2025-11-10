// components/attendee/VotePanel.tsx
import React, { useState } from "react";
import { Box, Button, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import type {PropositionDto} from "../../domain/propositions.ts";
import type {VoteOptionDto} from "../../domain/voteOptions.ts";

/* ---------------- Props ---------------- */

type Props = {
    meetingId: string;
    proposition: PropositionDto;
    isOpen: boolean; // controlled by live state (SignalR) later
};

/* ---------------- Component ---------------- */

export const VotePanel: React.FC<Props> = ({ meetingId, proposition, isOpen }) => {
    const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
    const isYesNo = proposition.voteType === "YesNoBlank";

    const handlePick = (_: unknown, value: string | null): void => {
        if (!isOpen) { return; }
        setSelectedOptionId(value);
    };

    const handleCastVote = (): void => {
        if (!isOpen || !selectedOptionId) { return; }
        const picked = findOptionById(proposition.voteOptions, selectedOptionId);
        if (!picked) { return; }

        // TODO: implement actual cast via RTK Mutation / endpoint
        // handleCastVote(proposition, picked, votationId)
        // - proposition: PropositionVm
        // - voteoption: VoteOption
        // - votationId: string (pass from live context when admin opens the vote)
        console.log("Cast vote (TODO)", { meetingId, propositionId: proposition.id, optionId: picked.id });
    };

    return (
        <Box className="w-full">
            <Box className="flex flex-col sm:flex-row sm:items-center gap-3">
                <ToggleButtonGroup
                    value={selectedOptionId}
                    exclusive
                    onChange={handlePick}
                    size="small"
                    color="primary"
                    aria-label="vote options"
                >
                    {proposition.voteOptions.map((opt) => (
                        <ToggleButton
                            key={opt.id}
                            value={opt.id}
                            aria-label={opt.label}
                            disabled={!isOpen}
                            className="capitalize"
                        >
                            {opt.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>

                <Button
                    variant="contained"
                    onClick={handleCastVote}
                    disabled={!isOpen || !selectedOptionId}
                >
                    Cast vote
                </Button>
            </Box>

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
