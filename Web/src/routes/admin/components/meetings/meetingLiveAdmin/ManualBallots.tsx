import React, { useMemo, useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";

type Proposition = any;

type ManualCounts = Record<string, number>;

interface Props {
    proposition: Proposition | null;
    disabled?: boolean;
    // Called with per-option counts and optional notes
    onApply: (counts: ManualCounts, notes?: string) => void;
}

export default function ManualBallots({ proposition, disabled, onApply }: Props) {
    const [notes, setNotes] = useState<string>("");
    // internal string inputs to allow empty/partial typing
    const [inputs, setInputs] = useState<Record<string, string>>({});

    // Determine options to show based on proposition shape
    const optionKeys = useMemo(() => {
        if (!proposition) return [] as string[];

        // Prefer explicit voteOptions array if present
        if (Array.isArray(proposition.voteOptions) && proposition.voteOptions.length > 0) {
            return proposition.voteOptions.map((o: any, idx: number) => (o?.id ?? String(idx)));
        }

        // If voteType signals yes/no/blank style, use keys
        const vt = (proposition.voteType ?? "").toString().toLowerCase();
        if (
            vt.includes("yes") ||
            vt.includes("no") ||
            vt.includes("blank") ||
            vt.includes("abstain") ||
            vt.includes("yea") ||
            vt.includes("nay")
        ) {
            return ["yes", "no", "blank"];
        }

        // Fallback to a single 'count' input
        return ["count"];
    }, [proposition]);

    // Build labels for keys
    const labelFor = (key: string, idx: number) => {
        if (!proposition) return key;
        if (Array.isArray(proposition.voteOptions) && proposition.voteOptions.length > 0) {
            const opt = proposition.voteOptions[idx];
            // Try common labels
            return opt?.displayText ?? opt?.label ?? opt?.text ?? opt?.name ?? `Option ${idx + 1}`;
        }

        if (key === "yes") return "Yes / For";
        if (key === "no") return "No / Against";
        if (key === "blank") return "Blank / Abstain";
        if (key === "count") return "Paper ballots (count)";
        return key;
    };

    const onChangeInput = (key: string, value: string) => {
        setInputs((p) => ({ ...p, [key]: value }));
    };

    const parsedCounts = useMemo(() => {
        const out: ManualCounts = {};
        let total = 0;
        for (const k of optionKeys) {
            const v = Number(inputs[k]);
            const n = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
            out[k] = n;
            total += n;
        }
        return { counts: out, total };
    }, [inputs, optionKeys]);

    const handleApply = () => {
        if (!proposition) return;
        // Only apply if there is at least one positive count
        if (parsedCounts.total <= 0) return;
        onApply(parsedCounts.counts, notes || undefined);
        // reset
        setInputs({});
        setNotes("");
    };

    return (
        <Box>
            <Typography variant="overline" color="text.secondary" className="tracking-wider">
                Manual ballots (paper)
            </Typography>

            <Box className="mt-2" sx={{ display: "grid", gap: 1.5 }}>
                {optionKeys.map((key: string, idx: number) => (
                    <Box key={key}>
                        <TextField
                            label={labelFor(key, idx)}
                            type="number"
                            inputMode="numeric"
                            value={inputs[key] ?? ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeInput(key, e.target.value)}
                            fullWidth
                            size="small"
                        />
                    </Box>
                ))}

                <Box>
                    <TextField
                        label="Notes"
                        value={notes}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                        size="small"
                    />
                </Box>

                <Box>
                    <Button
                        variant="contained"
                        fullWidth
                        disabled={disabled || !proposition || parsedCounts.total <= 0}
                        onClick={handleApply}
                    >
                        Add manual ballots ({parsedCounts.total})
                    </Button>
                </Box>
            </Box>

            {proposition && parsedCounts.total > 0 && (
                <Typography variant="body2" className="mt-2" color="text.secondary">
                    Proposed manual ballots to apply: <strong>{parsedCounts.total}</strong>
                </Typography>
            )}
        </Box>
    );
}
