import * as React from "react";
import {
    Paper, Typography, Box, Divider, ToggleButtonGroup, ToggleButton,
    TextField, Button, IconButton, Tooltip, Table, TableHead, TableRow,
    TableCell, TableBody
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import DownloadIcon from "@mui/icons-material/Download";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import AddIcon from "@mui/icons-material/Add";

export type AccessMode = "qr" | "codes" | "both";

export type VerificationCode = {
    id: string;
    code: string;           // e.g. 6–8 char code
    used: boolean;
    issuedTo?: string | null;
};

export default function AccessManager({
                                          meetingId,
                                          meetingCode,
                                          onRegenerateMeetingCode,
                                          accessMode,
                                          onChangeAccessMode,
                                          codes,
                                          onGenerateCodes,
                                          onExportCodes,
                                          locked,
                                      }: {
    meetingId: string;
    meetingCode: string;
    onRegenerateMeetingCode: () => void;

    accessMode: AccessMode;
    onChangeAccessMode: (m: AccessMode) => void;

    codes: VerificationCode[];
    onGenerateCodes: (count: number) => void;
    onExportCodes?: () => void;

    locked?: boolean;   // disable edits when meeting is Finished
}) {
    const [count, setCount] = React.useState(10);

    const copy = async (text: string) => {
        try { await navigator.clipboard.writeText(text); } catch {}
    };

    return (
        <Paper elevation={0} className="p-4 md:p-5 rounded-2xl border border-slate-100 mb-4">
            <Typography variant="subtitle1" className="!font-semibold">Manage meeting access</Typography>

            <Divider className="my-3" />

            {/* Access mode */}
            <Box className="flex flex-col md:flex-row gap-3 md:items-center">
                <Typography variant="body2" className="!text-slate-600">Access mode</Typography>
                <ToggleButtonGroup
                    value={accessMode}
                    exclusive
                    onChange={(_, v) => v && onChangeAccessMode(v)}
                    size="small"
                    disabled={locked}
                >
                    <ToggleButton value="qr"><QrCode2Icon fontSize="small" className="mr-1" /> QR Code and Link</ToggleButton>
                    <ToggleButton value="codes">Verification codes</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* Meeting code */}
            <Box className="mt-4 grid md:grid-cols-[1fr_auto_auto] gap-2 items-end">
                <TextField
                    label="Meeting code (share with attendees)"
                    size="small"
                    value={meetingCode}
                    InputProps={{ readOnly: true }}
                    onFocus={(e) => e.currentTarget.select()}
                />
                <Tooltip title="Copy">
          <span>
            <IconButton onClick={() => copy(meetingCode)}><ContentCopyIcon /></IconButton>
          </span>
                </Tooltip>
                <Tooltip title={locked ? "Meeting finished" : "Regenerate"}>
          <span>
            <IconButton onClick={onRegenerateMeetingCode} disabled={locked}><AutorenewIcon /></IconButton>
          </span>
                </Tooltip>
            </Box>

            {/* Codes generation */}
            <Box className="mt-5">
                <div className="flex items-center gap-2">
                    <Typography variant="subtitle1" className="!font-semibold">Verification codes</Typography>
                   
                </div>

                <Box className="mt-2 flex flex-wrap items-end gap-2">
                    <TextField
                        label="Generate"
                        type="number"
                        size="small"
                        inputProps={{ min: 1, max: 500 }}
                        value={count}
                        onChange={(e) => setCount(Math.max(1, Math.min(500, Number(e.target.value || 1))))}
                    />
                    <Button
                        variant="contained"
                        size="small"
                        disableElevation
                        startIcon={<AddIcon />}
                        className="!rounded-lg"
                        onClick={() => onGenerateCodes(count)}
                        disabled={locked}
                    >
                        Create {count}
                    </Button>
                </Box>

                <Box className="mt-3 w-full overflow-x-auto">
                    <Table size="small" className="min-w-[520px]">
                        <TableHead>
                            <TableRow className="bg-slate-50">
                                <TableCell>Code</TableCell>
                                <TableCell className="hidden sm:table-cell">Issued to</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {codes.map((c) => (
                                <TableRow key={c.id} hover>
                                    <TableCell>{c.code}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{c.issuedTo ?? "—"}</TableCell>
                                    <TableCell>{c.used ? "Used" : "Unused"}</TableCell>
                                    <TableCell align="right">
                                        <Button size="small" variant="text" onClick={() => copy(c.code)}>Copy</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {codes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4}>
                                        <Typography variant="body2" className="!text-slate-500 py-3 text-center">
                                            No verification codes yet.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Box>
                <div className="flex items-center gap-2 mt-4">
                    {onExportCodes && (
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            className="!rounded-lg ml-auto pt-3"
                            onClick={onExportCodes}
                            disabled={codes.length <= 0}
                        >
                            Export CSV
                        </Button>
                    )}
                </div>
                
            </Box>
        </Paper>
    );
}
