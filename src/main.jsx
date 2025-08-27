import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import "@rainbow-me/rainbowkit/styles.css";

import { WagmiProvider, http } from "wagmi";
import { polygonAmoy } from "wagmi/chains";
import {
  RainbowKitProvider,
  getDefaultConfig,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  // Provide a more forgiving fallback so the app can still start.
  // WalletConnect features will be disabled without a valid project ID.
  console.warn(
    "VITE_WALLETCONNECT_PROJECT_ID is missing. WalletConnect will be disabled.",
  );
}

const config = getDefaultConfig({
  appName: "GroupDAO",
  projectId: projectId || "demo",
  chains: [polygonAmoy],
  transports: {
    [polygonAmoy.id]: http(),
  },
});

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
