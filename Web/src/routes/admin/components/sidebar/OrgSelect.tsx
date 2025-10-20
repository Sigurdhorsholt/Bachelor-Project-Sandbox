// routes/admin/components/Sidebar/OrgSelect.tsx
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

type Org = { id: string; name: string };

export default function OrgSelect({
                                      orgs, orgId, onChange,
                                  }: { orgs: Org[]; orgId: string; onChange: (id: string) => void }) {
    return (
        <FormControl fullWidth size="small">
            <InputLabel id="org-label">Organisation</InputLabel>
            <Select labelId="org-label" label="Organisation" value={orgId} onChange={(e) => onChange(String(e.target.value))}>
                {orgs.map(o => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
            </Select>
        </FormControl>
    );
}
