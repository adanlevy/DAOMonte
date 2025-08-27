# GroupDAO

This project uses React and Vite.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file based on `.env.example` and set up a WalletConnect Cloud project ID:
   ```bash
   cp .env.example .env
   ```
   You'll need to create an account on [WalletConnect Cloud](https://cloud.walletconnect.com/) to obtain a **projectId**.
   Add it to your `.env` file:
   ```bash
   VITE_WALLETCONNECT_PROJECT_ID=<tu_project_id>
   ```
   Using the placeholder value `demo` will cause WalletConnect to return 403 responses.
   Without this value the app will still load but WalletConnect features
   will be disabled and a warning will appear at startup.

## Development

Start the development server:
```bash
npm run dev
```

Lint the project:
```bash
npm run lint
```
