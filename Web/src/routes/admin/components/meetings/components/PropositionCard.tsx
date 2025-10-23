// routes/admin/meetings/components/PropositionCard.tsx
import React from "react";
import {
    Paper, Typography, IconButton, Tooltip, TextField, Button, Divider, Chip, MenuItem,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import {
    useCreateVoteOptionMutation,
    useDeletePropositionMutation, useDeleteVoteOptionMutation,
    useGetVoteOptionsQuery,
    useUpdatePropositionMutation, useUpdateVoteOptionMutation
} from "../../../../../Redux/meetingsApi.ts";

import PropositionEditorDialog, {type VoteOptionRow} from "./PropositionEditorDialog";
import OptionEditorDialog from "./OptionEditorDialog";


type Props = {
    meetingId: string;
    itemId: string;
    index: number;
    propId: string;
    question: string;
    voteType: string; //"List" | "YesNoBlank"
    locked?: boolean;
};

const VOTE_TYPES = ["YesNoBlank", "AB", "List"];

export default function PropositionCard({
                                            meetingId, itemId, index, propId, question, voteType, locked,
                                        }: Props) {
    const [editing, setEditing] = React.useState(false);
    const [form, setForm] = React.useState({question, voteType});

    React.useEffect(() => setForm({question, voteType}), [question, voteType]);

    const [updateProp, {isLoading: saving}] = useUpdatePropositionMutation();
    const [deleteProp, {isLoading: removing}] = useDeletePropositionMutation();

    const {data: options = [], isFetching: loadingOptions, refetch} =
        useGetVoteOptionsQuery({meetingId, itemId, propId});

    const [createOpt, {isLoading: creatingOpt}] = useCreateVoteOptionMutation();
    const [updateOpt] = useUpdateVoteOptionMutation();
    const [deleteOpt] = useDeleteVoteOptionMutation();

    const [editorOpen, setEditorOpen] = React.useState(false);
    const [optionEditorOpen, setOptionEditorOpen] = React.useState(false);
    const [optionEditorMode, setOptionEditorMode] = React.useState<'add' | 'edit'>('add');
    const [optionEditorInitialLabel, setOptionEditorInitialLabel] = React.useState<string>("");
    const [optionEditorTargetId, setOptionEditorTargetId] = React.useState<string | undefined>(undefined);

    function openEditor() {
        if (locked) return;
        setEditorOpen(true);
    }

    async function handleEditConfirm(data: { question: string; voteType: string; options: VoteOptionRow[] }) {
        if (locked) return;
        // Map AB -> backend YesNoBlank
        const backendVoteType = data.voteType === "AB" ? "YesNoBlank" : data.voteType;

        const patch: { question?: string; voteType?: string } = {};
        if (data.question.trim() !== question) patch.question = data.question.trim();
        if (backendVoteType !== voteType) patch.voteType = backendVoteType;

        if (Object.keys(patch).length > 0) {
            await updateProp({meetingId, itemId, propId, ...patch}).unwrap();
        }

        // Handle options depending on target UI voteType
        if (data.voteType === "List") {
            // existing options from hook
            const existing = options || [];
            const existingById = new Map(existing.map(o => [o.id, o]));

            // new options from dialog; some may have id (if dialog initialized with them)
            const newOpts = data.options ?? [];

            // Create or update
            for (const no of newOpts) {
                const label = no.label?.trim();
                if (!label) continue;
                if (no.id) {
                    const existingOpt = existingById.get(no.id);
                    if (existingOpt && existingOpt.label !== label) {
                        await updateOpt({meetingId, itemId, propId, voteOptionId: no.id, label}).unwrap();
                    }
                    existingById.delete(no.id);
                } else {
                    await createOpt({meetingId, itemId, propId, label}).unwrap();
                }
            }

            // Remaining existingById entries were removed by user -> delete them
            for (const [id] of existingById) {
                await deleteOpt({meetingId, itemId, propId, voteOptionId: id}).unwrap();
            }
        } else if (backendVoteType === "YesNoBlank") {
            // Replace any existing options with canonical Yes/No/Blank defaults
            const existing = options || [];
            // Delete all existing options first
            for (const ex of existing) {
                if (ex.id) {
                    await deleteOpt({meetingId, itemId, propId, voteOptionId: ex.id}).unwrap();
                }
            }
            // Create defaults
            const defaults = ["Ja", "Nej", "Blank"];
            for (const label of defaults) {
                await createOpt({meetingId, itemId, propId, label}).unwrap();
            }
        }

        setEditorOpen(false);
        // Refresh options list
        refetch();
    }

    async function handleSave() {
        if (locked) return;
        const patch: { question?: string; voteType?: string } = {};
        if (form.question.trim() !== question) patch.question = form.question.trim();
        if (form.voteType !== voteType) patch.voteType = form.voteType;
        if (Object.keys(patch).length === 0) {
            setEditing(false);
            return;
        }
        await updateProp({meetingId, itemId, propId, ...patch}).unwrap();
        setEditing(false);
    }

    async function handleDeleteProp() {
        if (locked) return;
        if (!confirm("Delete proposition?")) return;
        await deleteProp({meetingId, itemId, propId}).unwrap();
        // parent will refresh its list via invalidation
    }

    function openAddOptionDialog() {
        if (locked) return;
        setOptionEditorMode('add');
        setOptionEditorInitialLabel('');
        setOptionEditorTargetId(undefined);
        setOptionEditorOpen(true);
    }

    function openRenameOptionDialog(optId: string, current: string) {
        if (locked) return;
        setOptionEditorMode('edit');
        setOptionEditorInitialLabel(current);
        setOptionEditorTargetId(optId);
        setOptionEditorOpen(true);
    }

    async function handleOptionEditorConfirm(label: string) {
        if (locked) return;
        if (optionEditorMode === 'add') {
            await createOpt({meetingId, itemId, propId, label}).unwrap();
        } else if (optionEditorMode === 'edit' && optionEditorTargetId) {
            await updateOpt({meetingId, itemId, propId, voteOptionId: optionEditorTargetId, label}).unwrap();
        }
        setOptionEditorOpen(false);
        refetch();
    }

    async function removeOption(optId: string) {
        if (locked) return;
        if (!confirm("Delete option?")) return;
        await deleteOpt({meetingId, itemId, propId, voteOptionId: optId}).unwrap();
        refetch();
    }

    return (
        <Paper elevation={0} className="p-3 rounded-xl border border-slate-400">
            <div className="flex items-start gap-2">
                {!editing ? (
                    <div className="flex-1">
                        <Typography className="!font-medium">
                            {index + 1}. {question}
                        </Typography>
                        <div className="mt-1">
                            <Chip size="small" label={`Type: ${voteType}`}/>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 grid md:grid-cols-2 gap-2">
                        <TextField
                            size="small"
                            label="Question"
                            value={form.question}
                            onChange={(e) => setForm((f) => ({...f, question: e.target.value}))}
                            disabled={saving || locked}
                        />
                        <TextField
                            select
                            size="small"
                            label="Vote type"
                            value={form.voteType}
                            onChange={(e) => setForm((f) => ({...f, voteType: e.target.value}))}
                            disabled={saving || locked}
                        >
                            {VOTE_TYPES.map(v => (
                                <MenuItem key={v} value={v}>{v}</MenuItem>
                            ))}
                        </TextField>
                        <div className="md:col-span-2 flex justify-end gap-2">
                            <Button size="small" variant="contained" disableElevation onClick={handleSave}
                                    disabled={saving || locked}>
                                Save
                            </Button>
                            <Button size="small" variant="outlined" onClick={() => setEditing(false)} disabled={saving}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {!locked && !editing && (
                    <div className="ml-auto flex items-center gap-1">
                        <Tooltip title="Edit proposition">
              <span>
                <IconButton size="small" onClick={openEditor} disabled={locked}>
                  <EditIcon fontSize="small"/>
                </IconButton>
              </span>
                        </Tooltip>
                        <Tooltip title="Remove proposition">
              <span>
                <IconButton size="small" onClick={handleDeleteProp} disabled={locked || removing}>
                  <DeleteIcon fontSize="small"/>
                </IconButton>
              </span>
                        </Tooltip>
                    </div>
                )}
            </div>

            <Divider className="my-3" />

            {/* Options */}
            <div className="flex items-center justify-between mb-2">
                <Typography variant="subtitle2" className="!font-semibold">Options</Typography>
                {voteType === "List" ? (
                    <Tooltip title={locked ? "Meeting is finished" : "Add option"}>
                        <span>
                            <Button
                                startIcon={<AddIcon/>}
                                variant="outlined"
                                size="small"
                                className="!rounded-lg"
                                onClick={openAddOptionDialog}
                                disabled={locked || creatingOpt}
                            >
                                 Add
                            </Button>
                        </span>
                    </Tooltip>
                ) : null}
            </div>

            {loadingOptions && <Typography variant="body2" className="!text-slate-500">Loading options…</Typography>}

            <div className="space-y-2">
                {voteType === "List" ? (
                    // Editable list managed by the user
                    <>
                        {options.map((opt: { id: string; label: string }) => (
                            <div key={opt.id}
                                 className="flex items-center gap-1 border border-slate-200 rounded-full px-2 py-1">
                                <span className="text-sm">{opt.label}</span>
                                {!locked && (
                                    <>
                                        <IconButton size="small" onClick={() => openRenameOptionDialog(opt.id, opt.label)}>
                                            <EditIcon fontSize="inherit"/>
                                        </IconButton>
                                        <IconButton size="small" onClick={() => removeOption(opt.id)}>
                                            <DeleteIcon fontSize="inherit"/>
                                        </IconButton>
                                    </>
                                )}
                            </div>
                        ))}

                        {options.length === 0 && !loadingOptions && (
                            <Typography variant="body2" className="!text-slate-500">No options.</Typography>
                        )}
                    </>
                ) : (voteType === "YesNoBlank" || voteType === "AB") ? (
                    // Fixed, non-editable options for Yes/No/Blank
                    <div className="flex gap-2">
                        <div className="px-3 py-1 border rounded-full bg-slate-50">Ja</div>
                        <div className="px-3 py-1 border rounded-full bg-slate-50">Nej</div>
                        <div className="px-3 py-1 border rounded-full bg-slate-50">Blank</div>
                    </div>
                ) : (
                    <Typography variant="body2" className="!text-slate-500">No options.</Typography>
                )}
            </div>

            {/* Editor dialog should always be available for editing question/type (options area appears only for List) */}
            <PropositionEditorDialog
                open={editorOpen}
                initial={{
                    question,
                    voteType: voteType === "YesNoBlank" ? "AB" : (voteType as any),
                    options: options.map(o => ({id: o.id, label: o.label}))
                }}
                onClose={() => setEditorOpen(false)}
                onConfirm={handleEditConfirm}
            />

            <OptionEditorDialog
                open={optionEditorOpen}
                initialLabel={optionEditorInitialLabel}
                title={optionEditorMode === 'add' ? 'Tilføj mulighed' : 'Rediger mulighed'}
                onClose={() => setOptionEditorOpen(false)}
                onConfirm={handleOptionEditorConfirm}
            />
        </Paper>
    );
}
