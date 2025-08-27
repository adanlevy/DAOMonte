import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import "@rainbow-me/rainbowkit/styles.css";

import { WagmiProvider, createConfig, http } from "wagmi";
import { polygonAmoy } from "wagmi/chains";
import {
  RainbowKitProvider,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const config = createConfig(
  getDefaultConfig({
    appName: "GroupDAO",
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
    chains: [polygonAmoy],
    transports: {
      [polygonAmoy.id]: http(),
    },
  }),
);

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename="/DAOMonte">
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <App />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
