# ⚡ Lightweight Wallet

A minimal, self-custodial, browser-only web3 wallet built on the [thirdweb v5 SDK](https://portal.thirdweb.com/typescript/v5).

- **Self-custodial**: your 12-word BIP-39 seed is generated in your browser and never leaves it. There is no backend and no account.
- **Encrypted at rest**: the seed is encrypted with your password (WebCrypto PBKDF2-SHA256, 310k iterations + AES-256-GCM) and stored only in this browser's localStorage.
- **Multi-account**: derive up to 3 HD accounts (BIP-44 path, `m/44'/60'/0'/0/i`) from one seed.
- **Multi-chain**: balances across Ethereum, Base, Polygon, Optimism, and Arbitrum; send native-token transfers on any of them.
- **Lightweight**: a single static page — host it anywhere (GitHub Pages, Netlify, Vercel, a USB stick).

## Setup

```bash
npm install
npm run dev
```

1. Get a free thirdweb **Client ID** at https://thirdweb.com/create-api-key (create an API key, add your deployed domain to allowed domains).
2. Open the app, paste the Client ID (it's a public, browser-safe identifier — not a secret).
3. Create a new wallet (write the seed phrase down!) or import an existing one, and set an encryption password.

## Build & share

```bash
npm run build   # outputs static files to dist/
```

Deploy `dist/` to any static host. Each user's keys live only in their own browser.

## Security notes

- If you forget the encryption password, the vault cannot be recovered — but you can always wipe it and re-import from your seed phrase.
- Losing the seed phrase means losing the funds. Store it offline, never digitally.
- Anyone with access to your unlocked browser session can spend your funds — lock the wallet when not in use.
- Clear your browser data = wallet gone. Seed phrase is the recovery path.

## Roadmap ideas

- ERC-20 token balances/transfers (thirdweb `getContract` + ERC-20 extensions)
- Transaction history via block explorer APIs
- dApp connection (inject an EIP-1193 provider — best as a browser extension)
