import React, {useState} from "react";
import {
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Container,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Paper,
    InputAdornment,
    Link as MUILink
} from "@mui/material";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import LoginIcon from "@mui/icons-material/Login";
import {useLoginMutation} from "../Redux/api";
import {setAuth} from "../Redux/auth/authSlice.ts";
import {useDispatch} from "react-redux";
import {useNavigate} from "react-router-dom";


// Mobile-first landing page using Material UI components and Tailwind utility classes
// Requirements met:
// - Mobile first layout
// - Meeting ID form that prevents submit default (no action)
// - Small Admin Login button that opens a modal with username/password
// For the LandingPage component, integrate RTK Query login as shown:
// import { useLoginMutation } from "../Redux/api";
// const [login, { isLoading, error }] = useLoginMutation();
// const handleLogin = async (e: React.FormEvent) => {
//   e.preventDefault();
//   try {
//     const result = await login({ email: adminUser, password: adminPass }).unwrap();
//     console.log('Logged in:', result);
//     handleCloseLogin();
//   } catch (err) {
//     console.error('Login failed', err);
//   }
// };
// Attach `onSubmit={handleLogin}` to the form in the Admin login modal.
export default function LandingPage() {
    const [meetingId, setMeetingId] = useState("");
    const [loginOpen, setLoginOpen] = useState(false);
    const [adminUser, setAdminUser] = useState("");
    const [adminPass, setAdminPass] = useState("");
    const [login, {isLoading, error}] = useLoginMutation();
    const dispatch = useDispatch();
    const nav = useNavigate();


    const handleSubmitMeeting = (e: { preventDefault: () => void; }) => {
        e.preventDefault(); // Do nothing on submit by design
    };

    const handleOpenLogin = async () => setLoginOpen(true);
    const handleCloseLogin = async () => setLoginOpen(false);

    const handleLogin = async () => {
        try {
            const r = await login({email: adminUser, password: adminPass}).unwrap();
            dispatch(setAuth({
                accessToken: r.accessToken, 
                email: r.email,
                roles: r.roles,
                refreshToken: null, // add later if you implement refresh
            }));
            nav("/admin");
        } catch (error){
            console.error('Login failed', error);
        }


    }


    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-slate-50 text-slate-900">
            {/* Top bar */}
            <AppBar position="static" elevation={0} color="transparent">
                <Toolbar className="!px-3 sm:!px-6">
                    <div className="flex items-center gap-2">
                        <MeetingRoomIcon className="!text-slate-900"/>
                        <Typography variant="h6" className="!font-semibold !text-slate-900">
                            Live Voting
                        </Typography>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        {/* Small admin login button (icon-only on mobile, label on md+) */}
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<LockOpenIcon/>}
                            onClick={handleOpenLogin}
                            aria-label="Admin login"
                            className="hidden xs:flex"
                        >
                            Admin
                        </Button>
                        <IconButton
                            onClick={handleOpenLogin}
                            className="xs:hidden"
                            size="small"
                            aria-label="Admin login"
                        >
                            <LoginIcon/>
                        </IconButton>
                    </div>
                </Toolbar>
            </AppBar>

            {/* Hero section */}
            <Container maxWidth="md" className="grow flex flex-col justify-center pt-6 pb-12">
                <Box className="text-center space-y-3 sm:space-y-4">
                    <Typography
                        variant="h3"
                        className="!text-2xl sm:!text-4xl !font-extrabold !tracking-tight"
                    >
                        Join Your Meeting Instantly
                    </Typography>
                    <Typography variant="body1" className="!text-base sm:!text-lg !text-slate-600">
                        Enter your Meeting ID to access live voting. No app. No fuss.
                    </Typography>
                </Box>

                {/* Meeting ID form */}
                <Paper elevation={1} className="mt-6 sm:mt-8 p-4 sm:p-6 rounded-2xl">
                    <form onSubmit={handleSubmitMeeting} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <TextField
                            id="meeting-id"
                            label="Meeting ID"
                            placeholder="e.g. 9X2-4AB-730"
                            variant="outlined"
                            fullWidth
                            autoComplete="off"
                            value={meetingId}
                            onChange={(e) => setMeetingId(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <MeetingRoomIcon/>
                                    </InputAdornment>
                                ),
                                inputProps: {"aria-label": "Meeting ID"},
                            }}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            className="sm:!w-40 !rounded-xl"
                            disableElevation
                        >
                            Enter
                        </Button>
                    </form>
                    <div className="mt-3 text-center text-xs sm:text-sm text-slate-500">
                        By continuing you agree to our {" "}
                        <MUILink href="#" underline="hover">Terms</MUILink> and {" "}
                        <MUILink href="#" underline="hover">Privacy</MUILink>.
                    </div>
                </Paper>

                {/* Trust / features row */}
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {[
                        {
                            title: "Secure & Anonymous",
                            text: "End-to-end encrypted ballots to keep votes private.",
                        },
                        {
                            title: "Fast Results",
                            text: "Live tallies with audit-ready exports for minutes.",
                        },
                        {
                            title: "No App Needed",
                            text: "Works on any device with a browser.",
                        },
                    ].map((f, i) => (
                        <Paper key={i} elevation={0} className="p-4 sm:p-5 rounded-2xl border border-slate-100">
                            <Typography variant="subtitle1" className="!font-semibold">
                                {f.title}
                            </Typography>
                            <Typography variant="body2" className="!text-slate-600 mt-1">
                                {f.text}
                            </Typography>
                        </Paper>
                    ))}
                </div>
            </Container>

            {/* Footer */}
            <footer className="border-t border-slate-200">
                <Container maxWidth="lg" className="py-5 flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
                    <Typography variant="caption" className="!text-slate-500">
                        © {new Date().getFullYear()} Live Voting. All rights reserved.
                    </Typography>
                    <div className="sm:ml-auto flex items-center gap-4 text-xs">
                        <MUILink href="#" underline="hover">Accessibility</MUILink>
                        <MUILink href="#" underline="hover">Contact</MUILink>
                    </div>
                </Container>
            </footer>

            {/* Admin Login Modal */}
            <Dialog open={loginOpen} onClose={handleLogin} aria-labelledby="admin-login-title" fullWidth maxWidth="xs">
                <DialogTitle id="admin-login-title">Admin Login</DialogTitle>
                <DialogContent>
                    <Box component="form" className="mt-2 space-y-3" onSubmit={(e) => e.preventDefault()}>
                        <TextField
                            label="Username"
                            value={adminUser}
                            onChange={(e) => setAdminUser(e.target.value)}
                            fullWidth
                            autoComplete="username"
                        />
                        <TextField
                            label="Password"
                            type="password"
                            value={adminPass}
                            onChange={(e) => setAdminPass(e.target.value)}
                            fullWidth
                            autoComplete="current-password"
                        />
                    </Box>
                </DialogContent>
                <DialogActions className="px-6 pb-4">
                    <Button onClick={handleCloseLogin} variant="text">Cancel</Button>
                    <Button onClick={handleLogin} variant="contained" disableElevation>
                        Login
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
