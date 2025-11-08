// components/FullScreenLoader.tsx
import React from "react";
import { Backdrop, Box, CircularProgress, Typography } from "@mui/material";

export type FullScreenLoaderProps = {
    /** Optional headline under the spinner */
    message?: string;
    /** Optional smaller line of text below the message */
    submessage?: string;
    /** Control visibility externally (defaults to true) */
    open?: boolean;
};

export default function FullScreenLoader(props: FullScreenLoaderProps) {
    const { message = "Loading…", submessage, open = true } = props;

    return (
        <Backdrop
            open={open}
    sx={{
        color: "#fff",
            zIndex: (theme) => theme.zIndex.modal + 1,
            backdropFilter: "blur(2px)",
    }}
    role="status"
    aria-live="polite"
    aria-busy={open ? "true" : "false"}
    >
    <Box
        sx={{
        width: "100vw",
            height: "100vh",
            display: "grid",
            placeItems: "center",
            p: 3,
    }}
>
    <Box
        sx={{
        display: "grid",
            placeItems: "center",
            gap: 2,
            textAlign: "center",
    }}
>
    <CircularProgress size={56} thickness={4} />
    <Typography component="p" variant="h6">
        {message}
        </Typography>
    {submessage ? (
        <Typography component="p" variant="body2" sx={{ opacity: 0.8 }}>
        {submessage}
        </Typography>
    ) : null}
    </Box>
    </Box>
    </Backdrop>
);
}
