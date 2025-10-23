import { AppBar, Toolbar, Typography, Button } from "@mui/material";
import MeetingRoomIcon from "@mui/icons-material/MeetingRoom";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";

type Props = {
    onMenuClick: () => void;
    onLogout: () => void;
};

export default function TopBar({ onMenuClick, onLogout }: Props) {
    return (
        <AppBar position="static" elevation={0} color="transparent">
            <Toolbar className="!px-3 sm:!px-6">
                <button className="md:hidden mr-2" onClick={onMenuClick} aria-label="Open sidebar">
                    <MenuIcon />
                </button>
                <div className="flex items-center gap-2">
                    <MeetingRoomIcon className="!text-slate-900" />
                    <Typography variant="h6" className="!font-semibold !text-slate-900">
                        Live Voting
                    </Typography>
                </div>
                <div className="ml-auto">
                    <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<LogoutIcon />}
                        onClick={onLogout}
                        className="hidden sm:flex"
                    >
                        Logout
                    </Button>
                </div>
            </Toolbar>
        </AppBar>
    );
}
