import React from "react";
import { Button, Tooltip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PropositionEditorDialog, { type VoteOptionRow } from "./PropositionEditorDialog";
import { useCreatePropositionMutation, useCreateVoteOptionMutation } from "../../../../../Redux/meetingsApi.ts";

type Props = {
  meetingId: string;
  itemId: string;
  locked?: boolean;
  disabled?: boolean;
  onCreated?: () => void;
};

export default function PropositionCreateDialog({ meetingId, itemId, locked, disabled, onCreated }: Props) {
  const [open, setOpen] = React.useState(false);
  const [createProp, { isLoading: creatingProp }] = useCreatePropositionMutation();
  const [createVoteOption] = useCreateVoteOptionMutation();

  function openDialog() {
    if (locked) return;
    setOpen(true);
  }

  async function handleConfirm(data: { question: string; voteType: string; options: VoteOptionRow[] }) {
    if (locked) return;
    // Map AB -> backend YesNoBlank
    const backendVoteType = data.voteType === "AB" ? "YesNoBlank" : data.voteType;

    const created = await createProp({ meetingId, itemId, question: data.question, voteType: backendVoteType }).unwrap();

    if (backendVoteType === "YesNoBlank") {
      // Create default Yes/No/Blank options (Danish labels used in UI)
      const defaults = ["Ja", "Nej", "Blank"];
      for (const label of defaults) {
        await createVoteOption({ meetingId, itemId, propId: created.id, label }).unwrap();
      }
    } else if (data.voteType === "List" && data.options?.length) {
      for (const opt of data.options) {
        const label = opt.label?.trim();
        if (!label) continue;
        await createVoteOption({ meetingId, itemId, propId: created.id, label }).unwrap();
      }
    }

    setOpen(false);
    onCreated?.();
  }

  return (
    <>
      <Tooltip title={locked ? "Mødet er afsluttet" : "Tilføj forslag"}>
        <span>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            className="!rounded-lg"
            onClick={openDialog}
            disabled={locked || disabled || creatingProp}
          >
            Tilføj
          </Button>
        </span>
      </Tooltip>

      <PropositionEditorDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
