import { configureStore } from "@reduxjs/toolkit";
import {api} from "./api.ts";
import authReducer from "./auth/authSlice.ts";
import attendeeAuthReducer from "./attendeeAuth/attendeeAuthSlice.ts";

export const store = configureStore({
    reducer: {
        [api.reducerPath]: api.reducer,
        auth: authReducer,
        attendeeAuth: attendeeAuthReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
