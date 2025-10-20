// routes/admin/components/Sidebar/DivisionList.tsx
import { List, ListItemButton, ListItemText, ListSubheader } from "@mui/material";
import DomainTreeIcon from "@mui/icons-material/AccountTree";

type Division = { id: string; name: string };

export default function DivisionList({
                                         divisions, divisionId, onChange,
                                     }: { divisions: Division[]; divisionId: string; onChange: (id: string) => void }) {
    return (
        <List
            dense
            subheader={
                <ListSubheader component="div" className="!bg-transparent !pl-0 flex items-center gap-2">
                    <DomainTreeIcon fontSize="small" /> Divisions
                </ListSubheader>
            }
            className="!px-0"
        >
            {divisions.map(d => (
                <ListItemButton key={d.id} selected={divisionId === d.id} onClick={() => onChange(d.id)} className="rounded-xl">
                    <ListItemText primary={d.name} />
                </ListItemButton>
            ))}
        </List>
    );
}
