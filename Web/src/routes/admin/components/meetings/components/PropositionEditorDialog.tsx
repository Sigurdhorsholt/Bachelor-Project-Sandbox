import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Box,
  MenuItem,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

export type VoteType = "YesNoBlank" | "List";

export type VoteOptionRow = { id?: string; label: string };

export type PropositionEditorResult = {
  question: string;
  voteType: VoteType;
  options: VoteOptionRow[]; // for List type; other types may send empty array
};

type Props = {
  open: boolean;
  initial?: Partial<PropositionEditorResult>;
  onClose: () => void;
  onConfirm: (data: PropositionEditorResult) => void;
};

const VOTE_TYPES: VoteType[] = ["YesNoBlank", "List"];

export default function PropositionEditorDialog({ open, initial, onClose, onConfirm }: Props) {
  const [question, setQuestion] = React.useState(initial?.question ?? "");
  const [voteType, setVoteType] = React.useState<VoteType>(
    (initial?.voteType as VoteType) ?? "YesNoBlank"
  );
  const [options, setOptions] = React.useState<VoteOptionRow[]>(initial?.options ?? []);

  React.useEffect(() => {
    if (open) {
      setQuestion(initial?.question ?? "");
      setVoteType((initial?.voteType as VoteType) ?? "YesNoBlank");
      setOptions(initial?.options ?? []);
    }
  }, [open, initial]);

  function addOption() {
    setOptions((s) => [...s, { label: "" }]);
  }

  function updateOptionLabel(idx: number, label: string) {
    setOptions((s) => s.map((o, i) => (i === idx ? { ...o, label } : o)));
  }

  function removeOption(idx: number) {
    setOptions((s) => s.filter((_, i) => i !== idx));
  }

  function handleConfirm() {
    const q = question.trim();
    if (!q) return; // don't allow empty
    // Normalize voteType: treat AB as AB in the UI but the caller may map to backend value
    onConfirm({ question: q, voteType, options: voteType === "List" ? options.filter(o => o.label.trim()) : [] });
  }

  const canSave = question.trim().length > 0 && (voteType !== "List" || options.some(o => o.label.trim().length > 0));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? "Rediger forslag" : "Nyt forslag"}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Spørgsmål"
          fullWidth
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <TextField
          select
          margin="dense"
          label="Type"
          value={voteType}
          onChange={(e) => setVoteType(e.target.value as VoteType)}
          fullWidth
        >
          {VOTE_TYPES.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>

        {voteType === "List" && (
          <Box sx={{ mt: 2 }}>
            <Box className="flex items-center justify-between">
              <Typography variant="subtitle2">Muligheder</Typography>
              <IconButton size="small" onClick={addOption} aria-label="Tilføj mulighed">
                <AddIcon />
              </IconButton>
            </Box>

            {options.map((opt, idx) => (
              <Box key={opt.id ?? idx} display="flex" gap={1} alignItems="center" sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  placeholder={"Label"}
                  value={opt.label}
                  onChange={(e) => updateOptionLabel(idx, e.target.value)}
                  fullWidth
                />
                <IconButton size="small" onClick={() => removeOption(idx)} aria-label="Fjern mulighed">
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}

            {options.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Ingen muligheder endnu.
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Annuller</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!canSave}>
          Gem
        </Button>
      </DialogActions>
    </Dialog>
  );
}

