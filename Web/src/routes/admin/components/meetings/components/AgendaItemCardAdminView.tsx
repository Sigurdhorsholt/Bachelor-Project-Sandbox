// routes/admin/meetings/components/AgendaItemCard.tsx
import React from "react";
import {
    Paper, Typography, IconButton, Tooltip, Button, TextField, Collapse, Box, Divider,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";


import PropositionCard from "./PropositionCard";
import PropositionCreateDialog from "./PropositionCreateDialog";
import {
    useDeleteAgendaItemMutation,
    useGetPropositionsQuery,
    useUpdateAgendaItemMutation,
} from "../../../../../Redux/meetingsApi.ts";

type Props = {
    meetingId: string;
    itemId: string;
    index: number;
    title: string;
    description?: string | null;
    locked?: boolean;
    onRequestRename?: (itemId: string, currentTitle: string) => void;
};

export default function AgendaItemCardAdminView({
                                           meetingId, itemId, index, title, description, locked,
                                           onRequestRename,
                                       }: Props) {
    const [editing, setEditing] = React.useState(false);
    const [form, setForm] = React.useState({ title, description: description ?? "" });

    React.useEffect(() => setForm({ title, description: description ?? "" }), [title, description]);

    const { data: propositions = [], isFetching, refetch } = useGetPropositionsQuery({ meetingId, itemId });
    const [updateAgendaItem, { isLoading: saving }] = useUpdateAgendaItemMutation();
    const [deleteAgendaItem, { isLoading: removing }] = useDeleteAgendaItemMutation();

    async function handleSave() {
        if (locked) return;
        const patch: { title?: string; description?: string | null } = {};
        if (form.title.trim() !== title) patch.title = form.title.trim();
        // allow empty description explicitly
        if ((form.description ?? "") !== (description ?? "")) patch.description = form.description;
        if (Object.keys(patch).length === 0) {
            setEditing(false);
            return;
        }
        await updateAgendaItem({ meetingId, itemId, ...patch }).unwrap();
        setEditing(false);
    }

    async function handleDelete() {
        if (locked) return;
        if (!confirm("Fjern dagsordenspunkt og dets indhold?")) return;
        await deleteAgendaItem({ meetingId, itemId }).unwrap();
        // parent will re-fetch agenda; local card will unmount
    }

    return (
        <Paper elevation={0} className="p-3 md:p-4 rounded-xl border border-slate-400">
            {/* Header */}
            <div className="flex items-center gap-2">
                {!editing ? (
                    <Typography className="!font-medium">
                        {index + 1}. {title}
                    </Typography>
                ) : (
                    <div className="grid md:grid-cols-2 gap-2 w-full">
                        <TextField
                            size="small"
                            label="Titel"
                            value={form.title}
                            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                            disabled={saving || locked}
                        />
                        <div className="flex items-center gap-2 justify-end">
                            <Button size="small" variant="contained" disableElevation onClick={handleSave} disabled={saving || locked}>
                                Gem
                            </Button>
                            <Button size="small" variant="outlined" onClick={() => setEditing(false)} disabled={saving}>
                                Annuller
                            </Button>
                        </div>
                    </div>
                )}

                {!locked && !editing && (
                    <div className="ml-auto flex items-center gap-1">
                        <Tooltip title="Rediger punkt">
              <span>
                <IconButton size="small" onClick={() => onRequestRename ? onRequestRename(itemId, title) : setEditing(true)} disabled={locked}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
                        </Tooltip>
                        <Tooltip title="Fjern punkt">
              <span>
                <IconButton size="small" onClick={handleDelete} disabled={locked || removing}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
                        </Tooltip>
                    </div>
                )}
            </div>

            {/* Description (inline editable when in edit mode) */}
            <Collapse in={!editing && !!(description ?? "").length}>
                <Typography variant="body2" className="!text-slate-600 mt-1 whitespace-pre-wrap">
                    {description}
                </Typography>
            </Collapse>

            <Collapse in={editing}>
                <Box className="mt-2">
                    <TextField
                        size="small"
                        label="Beskrivelse"
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        disabled={saving || locked}
                        fullWidth
                        multiline
                        minRows={2}
                    />
                </Box>
            </Collapse>

            <Divider className="my-3" />

            {/* Proposition list */}
            <div className="flex items-center justify-between mb-2">
                <Typography variant="subtitle2" className="!font-semibold">Propositioner</Typography>
                <PropositionCreateDialog meetingId={meetingId} itemId={itemId} locked={locked} disabled={isFetching} onCreated={() => refetch()} />
             </div>

             {isFetching && <Typography variant="body2" className="!text-slate-500">Loading…</Typography>}

             <div className="space-y-2">
                 {propositions.map((p, idx) => (
                     <PropositionCard
                         key={p.id}
                         meetingId={meetingId}
                         itemId={itemId}
                         index={idx}
                         propId={p.id}
                         question={p.question}
                         voteType={p.voteType}
                         locked={locked}
                     />
                 ))}
                {/* Creation handled by PropositionCreateDialog */}
                 {propositions.length === 0 && !isFetching && (
                     <Typography variant="body2" className="!text-slate-500">Ingen forslag endnu.</Typography>
                 )}
             </div>
         </Paper>
     );
 }
