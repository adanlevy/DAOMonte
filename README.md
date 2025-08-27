# GroupDAO

This project uses React and Vite.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file based on `.env.example` and add your WalletConnect Cloud project ID:
   ```bash
   cp .env.example .env
   # edit .env and set VITE_WALLETCONNECT_PROJECT_ID
   ```
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
