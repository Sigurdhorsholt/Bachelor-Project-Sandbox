import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type AuthState = {
    accessToken: string | null;
    refreshToken: string | null;
    email: string | null;
    roles: string[];
};

const initial: AuthState = (() => {
    const raw = localStorage.getItem("auth");
    return raw ? JSON.parse(raw) : { accessToken: null, refreshToken: null, email: null, roles: [] };
})();

const slice = createSlice({
    name: "auth",
    initialState: initial as AuthState,
    reducers: {
        setAuth(state, action: PayloadAction<Partial<AuthState>>) {
            Object.assign(state, action.payload);
            localStorage.setItem("auth", JSON.stringify(state));
        },
        clearAuth(state) {
            state.accessToken = null;
            state.refreshToken = null;
            state.email = null;
            state.roles = [];
            localStorage.removeItem("auth");
        },
    },
});

export const { setAuth, clearAuth } = slice.actions;
export default slice.reducer;
