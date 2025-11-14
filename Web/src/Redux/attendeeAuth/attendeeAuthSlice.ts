import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type AttendeeAuthState = {
    accessToken: string | null;
    meetingId: string | null;
    ticketId: string | null;
    ticketCode: string | null;
};

const initial: AttendeeAuthState = (() => {
    const raw = sessionStorage.getItem("attendeeAuth");
    return raw ? JSON.parse(raw) : { accessToken: null, meetingId: null, ticketId: null, ticketCode: null };
})();

const slice = createSlice({
    name: "attendeeAuth",
    initialState: initial as AttendeeAuthState,
    reducers: {
        setAttendeeAuth(state, action: PayloadAction<Partial<AttendeeAuthState>>) {
            Object.assign(state, action.payload);
            sessionStorage.setItem("attendeeAuth", JSON.stringify(state));
        },
        clearAttendeeAuth(state) {
            state.accessToken = null;
            state.meetingId = null;
            state.ticketId = null;
            state.ticketCode = null;
            sessionStorage.removeItem("attendeeAuth");
        },
    },
});

export const { setAttendeeAuth, clearAttendeeAuth } = slice.actions;
export default slice.reducer;

