// routes/admin/components/Sidebar/MeetingList.tsx
import { List, ListItemButton, ListItemText, ListSubheader, Typography } from "@mui/material";
import EventIcon from "@mui/icons-material/Event";

type Meeting = { id: string; title: string; startsAt: string; status: string };

export default function MeetingList({
                                        meetings, selectedId, onSelect,
                                    }: { meetings: Meeting[]; selectedId: string; onSelect: (id: string) => void }) {
    return (
        <List
            dense
            subheader={
                <ListSubheader component="div" className="!bg-transparent !pl-0 flex items-center gap-2">
                    <EventIcon fontSize="small" /> Meetings in division
                </ListSubheader>
            }
            className="!px-0"
        >
            {meetings.map(m => (
                <ListItemButton key={m.id} selected={selectedId === m.id} onClick={() => onSelect(m.id)} className="rounded-xl">
                    <ListItemText primary={m.title} secondary={new Date(m.startsAt).toLocaleString()} />
                </ListItemButton>
            ))}
            {meetings.length === 0 && (
                <Typography variant="body2" className="!text-slate-500 px-2 py-1">No meetings.</Typography>
            )}
        </List>
    );
}
