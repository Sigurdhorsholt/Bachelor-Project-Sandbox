import * as React from "react";
import {
    Paper, Typography, Box, Divider, ToggleButtonGroup, ToggleButton,
    TextField, Button, IconButton, Tooltip, Table, TableHead, TableRow,
    TableCell, TableBody, Accordion, AccordionSummary, AccordionDetails
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import DownloadIcon from "@mui/icons-material/Download";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export type AccessMode = "qr" | "codes" ;

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
                                          onClearCodes,
                                          onReplaceCodes,
                                          onExportCodes,
                                          locked,
                                          startCollapsed = true,
                                      }: {
    meetingId: string;
    meetingCode: string;
    onRegenerateMeetingCode: () => void;

    accessMode: AccessMode;
    onChangeAccessMode: (m: AccessMode) => void;

    codes: VerificationCode[];
    onGenerateCodes: (count: number) => void;
    onClearCodes?: () => void;
    onReplaceCodes?: (count: number) => void;
    onExportCodes?: () => void;

    locked?: boolean;   // disable edits when meeting is Finished
    startCollapsed?: boolean; // if true the accordion starts collapsed (default true)
}) {
    const [count, setCount] = React.useState(10);
    const copy = async (text: string) => {
        try { await navigator.clipboard.writeText(text); } catch {}
    };

    // Refs to toggle buttons so we can focus the selected one programmatically
    const qrRef = React.useRef<HTMLButtonElement | null>(null);
    const codesRef = React.useRef<HTMLButtonElement | null>(null);

    // Focus the selected toggle so it's visually obvious which one is active
    React.useEffect(() => {
        if (locked) return;
        const ref = accessMode === "qr" ? qrRef : codesRef;
        if (ref.current) {
            try { ref.current.focus(); } catch { /* ignore */ }
        }
    }, [accessMode, locked]);

    // Build a simple meeting link (adjust if your real route differs)
    const meetingLink = typeof window !== "undefined" && meetingId
        ? `${window.location.origin}/meeting/${meetingCode}/login`
        : "";

    return (
        <Accordion defaultExpanded={!startCollapsed}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" className="!font-semibold">Administrer adgang til mødet</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Paper elevation={0} className="p-4 md:p-5 rounded-2xl border border-slate-100 mb-4">
                    {/* Divider removed because the summary already acts as the title */}

                    {/* Access mode */}
                    <Box className="flex flex-col md:flex-row gap-3 md:items-center">
                        <Typography variant="body2" className="!text-slate-600">
                            Adgangstype
                        </Typography>
                        <ToggleButtonGroup
                            value={accessMode}
                            exclusive
                            onChange={(_, v) => v && onChangeAccessMode(v)}
                            size="small"
                            disabled={locked}
                        >
                            <ToggleButton value="qr" ref={qrRef}><QrCode2Icon fontSize="small" className="mr-1" />
                                QR-kode og link
                            </ToggleButton>
                            <ToggleButton value="codes" ref={codesRef}>
                                Verifikationskoder
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    {/* Meeting code */}
                    <Box className="mt-4 grid md:grid-cols-[1fr_auto_auto] gap-2 items-end">
                        <TextField
                            label="Mødekode (del med deltagere)"
                            size="small"
                            value={meetingCode}
                            InputProps={{ readOnly: true }}
                            onFocus={(e) => e.currentTarget.select()}
                        />
                        <Tooltip title="Kopiér">
                  <span>
                    <IconButton onClick={() => copy(meetingCode)}><ContentCopyIcon /></IconButton>
                  </span>
                        </Tooltip>
                        <Tooltip title={locked ? "Mødet er afsluttet" : "Genskab kode"}>
                  <span>
                    <IconButton onClick={onRegenerateMeetingCode} disabled={locked}><AutorenewIcon /></IconButton>
                  </span>
                        </Tooltip>
                    </Box>

                    {/* Conditional panes: show codes UI only when 'codes' selected, otherwise show QR/link pane */}
                    {accessMode === "codes" ? (
                        <Box className="mt-5">
                            <div className="flex items-center gap-2">
                                <Typography variant="subtitle1" className="!font-semibold">Verifikationskoder</Typography>
                            </div>

                            <Box className="mt-2 flex flex-wrap items-end gap-2">
                                <TextField
                                    label="Opret antal"
                                    type="number"
                                    size="small"
                                    inputProps={{ min: 1, max: 500 }}
                                    value={count}
                                    onChange={(e) => setCount(Math.max(1, Math.min(500, Number(e.target.value || 1))))}
                                />
                                {codes && codes.length > 0 ? (
                                    <>
                                        <Button variant="outlined" size="small" className="!rounded-lg" onClick={() => onClearCodes && onClearCodes()} disabled={locked}>
                                            Ryd koder
                                        </Button>
                                        <Button variant="contained" size="small" disableElevation startIcon={<AutorenewIcon />} className="!rounded-lg" onClick={() => onReplaceCodes && onReplaceCodes(count)} disabled={locked}>
                                            Opdater {count}
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="contained"
                                        size="small"
                                        disableElevation
                                        startIcon={<AddIcon />}
                                        className="!rounded-lg"
                                        onClick={() => onGenerateCodes(count)}
                                        disabled={locked}
                                    >
                                        Opret {count}
                                    </Button>
                                )}
                            </Box>

                            <Box className="mt-3 w-full overflow-x-auto">
                                <Table size="small" className="min-w-[520px]">
                                    <TableHead>
                                        <TableRow className="bg-slate-50">
                                            <TableCell>Kode</TableCell>
                                            <TableCell className="hidden sm:table-cell">Udstedt til</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell align="right">Handlinger</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {codes.map((c) => (
                                            <TableRow key={c.id} hover>
                                                <TableCell>{c.code}</TableCell>
                                                <TableCell className="hidden sm:table-cell">{c.issuedTo ?? "—"}</TableCell>
                                                <TableCell>{c.used ? "Brugt" : "Ikke brugt"}</TableCell>
                                                <TableCell align="right">
                                                    <Button size="small" variant="text" onClick={() => copy(c.code)}>Kopiér</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {codes.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={4}>
                                                    <Typography variant="body2" className="!text-slate-500 py-3 text-center">
                                                        Ingen verifikationskoder endnu.
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
                                        Eksporter CSV
                                    </Button>
                                )}
                            </div>
                        </Box>
                    ) : (
                        <Box className="mt-5">
                            <div className="flex items-center gap-2">
                                <Typography variant="subtitle1" className="!font-semibold">QR-kode og link</Typography>
                            </div>

                            <Box className="mt-2 flex flex-wrap items-end gap-2">
                                <TextField
                                    label="Mødelink"
                                    size="small"
                                    fullWidth
                                    value={meetingLink}
                                    InputProps={{ readOnly: true }}
                                    onFocus={(e) => e.currentTarget.select()}
                                />
                                <Tooltip title="Kopiér link">
                                    <span>
                                        <IconButton onClick={() => copy(meetingLink)} disabled={!meetingLink}><ContentCopyIcon /></IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Download QR (ikke implementeret)">
                                    <span>
                                        <IconButton disabled><DownloadIcon /></IconButton>
                                    </span>
                                </Tooltip>
                            </Box>

                            <Typography variant="body2" className="!text-slate-500 mt-3">
                                Vis et QR-billede her i fremtiden. Linket ovenfor kan deles direkte med deltagere.
                            </Typography>
                        </Box>
                    )}

                </Paper>
            </AccordionDetails>
        </Accordion>
    );
}
