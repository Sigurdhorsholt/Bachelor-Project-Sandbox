// routes/admin/components/meetings/MeetingDetails.tsx
import {Paper, Typography, Box, Chip, Button} from "@mui/material";
import {useNavigate} from "react-router-dom";

type Meeting = { id: string; title: string; startsAt: string; status: string } | null;

export default function MeetingDetails({
                                           meeting, orgName, divisionName,
                                       }: { meeting: Meeting; orgName: string; divisionName: string }) {
    const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "—");
    const navigate = useNavigate();

    if (!meeting) {
        return <Typography variant="body2" className="!text-slate-500">Select a meeting to view details.</Typography>;
    }

    const goEdit = () => navigate(`/admin/meetings/${meeting.id}`);

    const goStartMeeting = () => {
        // TODO: keep any pre-flight checks here (e.g. confirm start / permissions)
        
        
        
        navigate(`/admin/meetings/${meeting.id}/live`);
    };

    const goViewResults = () => {
        console.log("Viewing results for meeting:", meeting.id);
    };

    const resultButtonDisabled = meeting.status !== "Finished";

    const startButtonDisabled = !(meeting.status === "Scheduled");


    return (
        <Paper elevation={0} className="p-4 md:p-5 rounded-2xl border border-slate-100">
            <Typography variant="h6" className="!font-semibold">
                {meeting.title}
            </Typography>
            <div className="mt-1 text-sm text-slate-600">
                Organisation: {orgName} • Afdeling: {divisionName}
            </div>
            <div className="mt-1 text-sm text-slate-600">
                Starter: {fmt(meeting.startsAt)}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
                Status:
                <Chip size="small" label={meeting.status}/>
            </div>
            <Box className="mt-4 flex flex-wrap gap-2">
                <Button variant="contained" disableElevation className="!rounded-lg" onClick={goEdit}>
                    Åben Møde
                </Button>
                <Button variant="outlined" className="!rounded-lg" disabled={resultButtonDisabled}
                        onClick={goViewResults}>
                    Resultater
                </Button>
                <Button variant="outlined" className="!rounded-lg" disabled={startButtonDisabled}
                        onClick={goStartMeeting}>
                    Start møde
                </Button>
            </Box>
        </Paper>
    );
}
