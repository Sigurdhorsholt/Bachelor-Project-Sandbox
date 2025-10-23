import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button } from "@mui/material";

type Props = {
  open: boolean;
  initialLabel?: string;
  title?: string;
  onClose: () => void;
  onConfirm: (label: string) => void;
};

export default function OptionEditorDialog({ open, initialLabel = "", title = "Option", onClose, onConfirm }: Props) {
  const [label, setLabel] = React.useState(initialLabel);

  React.useEffect(() => {
    if (open) setLabel(initialLabel ?? "");
  }, [open, initialLabel]);

  const canSave = (label ?? "").trim().length > 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Label"
          fullWidth
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuller</Button>
        <Button onClick={() => onConfirm(label.trim())} variant="contained" disabled={!canSave}>
          Gem
        </Button>
      </DialogActions>
    </Dialog>
  );
}

