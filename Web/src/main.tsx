import React from "react";
import ReactDOM from "react-dom/client";
import {Provider} from "react-redux";
import App from "./App";
import "./index.css";
import {store} from "./Redux/store.ts";
import {StyledEngineProvider} from "@mui/material/styles";


ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <Provider store={store}>

            <StyledEngineProvider injectFirst>
                <App/>
            </StyledEngineProvider>
        </Provider>
    </React.StrictMode>
)
