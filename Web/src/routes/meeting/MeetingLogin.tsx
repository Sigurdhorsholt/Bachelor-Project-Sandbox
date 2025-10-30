import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Box,
    Alert,
} from "@mui/material";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import { useAttendeeLoginMutation } from "../../Redux/api";
import { setAttendeeAuth } from "../../Redux/attendeeAuth/attendeeAuthSlice";

export default function MeetingLogin() {
    const { id: meetingCode } = useParams<{ id: string }>();
    const [accessCode, setAccessCode] = useState("");
    const [attendeeLogin, { isLoading, error }] = useAttendeeLoginMutation();
    const dispatch = useDispatch();
    const nav = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!meetingCode || !accessCode.trim()) return;

        try {
            const result = await attendeeLogin({
                meetingCode,
                accessCode: accessCode.trim(),
            }).unwrap();

            dispatch(setAttendeeAuth({
                accessToken: result.accessToken,
                meetingId: result.meetingId,
                ticketId: result.ticketId,
            }));

            // Redirect to the meeting dashboard
            console.log(meetingCode)
            nav(`/meeting/${meetingCode}/live`, { replace: true });
        } catch (err) {
            console.error("Attendee login failed:", err);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-slate-50">
            <Container maxWidth="sm" className="grow flex flex-col justify-center py-12">
                <Paper elevation={2} className="p-6 sm:p-8 rounded-2xl">
                    <Box className="flex items-center gap-3 mb-6">
                        <MeetingRoomIcon className="!text-4xl text-blue-600" />
                        <div>
                            <Typography variant="h5" className="!font-bold">
                                Indtast adgangskode
                            </Typography>
                            <Typography variant="body2" className="!text-slate-600">
                                Møde: {meetingCode}
                            </Typography>
                        </div>
                    </Box>

                    {error && (
                        <Alert severity="error" className="mb-4">
                            {(error as any)?.data?.error || "Ugyldig adgangskode eller møde ikke fundet"}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <TextField
                            label="Din personlige adgangskode"
                            placeholder="fx. ABC123"
                            variant="outlined"
                            fullWidth
                            autoFocus
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            disabled={isLoading}
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            fullWidth
                            disabled={isLoading || !accessCode.trim()}
                            className="!rounded-xl"
                        >
                            {isLoading ? "Logger ind..." : "Få adgang til mødet"}
                        </Button>
                    </form>

                    <Typography variant="caption" className="block mt-4 text-center !text-slate-500">
                        Du skulle have modtaget din adgangskode via e-mail eller fra mødeadministratoren.
                    </Typography>
                </Paper>
            </Container>
        </div>
    );
}

