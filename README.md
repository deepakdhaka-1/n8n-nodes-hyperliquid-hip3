# n8n-nodes-hyperliquid-hip3

This is an n8n community node for integrating with **Hyperliquid HIP-3 builder-deployed perpetual DEXes** — custom perp markets deployed by builders on top of Hyperliquid infrastructure (e.g. `xyz:XYZ100`).

> ⚠️ **This node is for HIP-3 assets only.** For standard Hyperliquid perpetuals (BTC, ETH, SOL, etc.), use the [n8n-nodes-hyperliquid](https://www.npmjs.com/package/n8n-nodes-hyperliquid) node instead.

---

## What is HIP-3?

[HIP-3 (Builder-Deployed Perpetuals)](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-3-builder-deployed-perpetuals) allows anyone to deploy their own perpetual futures markets on Hyperliquid. Assets on these DEXes use a `dex:SYMBOL` naming convention (e.g. `xyz:XYZ100`).

This node handles the `dex` scoping automatically — you enter just the symbol (e.g. `XYZ100`) and the node prefixes it with the DEX name configured in your credentials.

---

## Features

### Order Operations
- **Place Market Order** — Execute market orders with slippage protection
- **Place LiBUSL-1.1 Order** — Place liBUSL-1.1 orders with GTC, IOC, or Post Only (ALO) time-in-force
- **Place Take Profit** — Set take profit trigger orders
- **Place Stop Loss** — Set stop loss trigger orders
- **Modify Order** — Modify an existing open order
- **Cancel Order** — Cancel a specific order by ID
- **Cancel by Client ID** — Cancel an order using a client-assigned order ID
- **Cancel All Orders** — Cancel all open orders on this DEX
- **Schedule Cancel** — Schedule a future cancel-all
- **Get Open Orders** — Retrieve all currently open orders on this DEX
- **Get Order Status** — Look up a specific order by ID
- **Get Order History** — Retrieve historical fills/trades
- **Get Historical Orders** — Retrieve all historical orders

### Position Operations
- **Get Open Positions** — View all current positions with PnL data
- **Close Position** — Close a position with a market order
- **Update Leverage** — Modify leverage (with automatic `onlyIsolated` validation)
- **Update Isolated Margin** — Add or remove margin from an isolated position
- **Get Trade History** — View historical trades

### Account Operations
- **Get Balance** — View account value and withdrawable amount
- **Get Margin Summary** — Detailed margin information
- **Get User Funding** — Historical funding payments
- **Get User Fees** — Fee rates and schedule

### Market Data
- **Get All Prices** — Mid prices for all assets on this DEX
- **Get Asset Price** — Price for a specific asset
- **Get Asset Metadata** — Asset specs (`szDecimals`, `maxLeverage`, `onlyIsolated`)
- **Get Meta And Asset Contexts** — Metadata with mark price, OI, and funding
- **Get Order Book** — L2 order book data
- **Get Candle Snapshot** — OHLCV candle history
- **Get Funding History** — Historical funding rates
- **Get Predicted Fundings** — Predicted next funding rates
- **Get Recent Trades** — Recent trade feed
- **List All DEXes** — Discover all available HIP-3 builder-deployed DEXes
- **Get DEX LiBUSL-1.1s** — Leverage caps and position liBUSL-1.1s for this DEX

---

## Installation

### In n8n

1. Go to **Settings** → **Community Nodes**
2. Select **Install**
3. Enter `n8n-nodes-hyperliquid-hip3`
4. Agree to the risks and click **Install**

### Manual Installation

```bash
npm install n8n-nodes-hyperliquid-hip3
```

---

## Credentials

This node uses its own credential type — **Hyperliquid HIP-3 API** — which is completely separate from the standard Hyperliquid node credentials.

### Configuration Fields

| Field | Required | Description |
|-------|----------|-------------|
| **DEX Name** | ✅ | The builder-deployed DEX identifier (e.g. `xyz`). Assets are automatically prefixed as `dex:SYMBOL`. |
| **Wallet Type** | ✅ | `API Wallet (Agent)` — recommended. Cannot withdraw. Or `Main Wallet` — full access. |
| **Private Key** | ✅ | 64 hex characters with `0x` prefix. Encrypted at rest using AES-256. |
| **Master Wallet Address** | ✅ (agent only) | The master account address that authorized this API wallet. |
| **Network** | ✅ | `Mainnet` or `Testnet`. |
| **Vault Address** | ❌ | Optional. For subaccount/vault trading. |

### Wallet Types

1. **API Wallet (Agent) — Recommended**
   - Generate a new Ethereum keypair
   - Approve it as an agent in [app.hyperliquid.xyz](https://app.hyperliquid.xyz) → API settings
   - Use the agent's private key with your master wallet address
   - Cannot withdraw funds — safe for automated systems

2. **Main Wallet**
   - Use your main wallet's private key directly
   - Can trade and withdraw — not recommended for automation

---

## Asset Naming

HIP-3 assets use the format `dex:SYMBOL`. In this node, you only enter the **symbol** — the DEX prefix is added automatically from credentials.

| You enter | Node sends to API |
|-----------|-------------------|
| `XYZ100` | `xyz:XYZ100` |
| `ABC` | `xyz:ABC` |

If you paste a fully-prefixed coin (e.g. `xyz:XYZ100`), the node will detect the colon and skip re-prefixing.

---

## Important Notes for HIP-3 Assets

- **`onlyIsolated`** — Many HIP-3 assets only support isolated margin. The node checks this automatically when you call `Update Leverage` and throws a clear error if you try to set cross margin on an isolated-only asset.
- **`maxLeverage`** — HIP-3 assets often have lower max leverage than standard perps. Use `Get Asset Metadata` to check before placing orders.
- **`szDecimals`** — Lot size precision varies per asset. Check metadata to avoid size precision errors.

---

## Security

- Private keys are encrypted using AES-256-CBC before database storage
- API wallets are strongly recommended — they cannot withdraw funds
- The node validates private key format (`0x` + 64 hex chars) before any API call
- Uses EIP-712 typed data signing with chain ID 1337 to prevent replay attacks

---

## API Reference

This node interacts with:

- **Exchange API** (`/exchange`) — For trading operations (requires EIP-712 signing)
- **Info API** (`/info`) — For querying data (no signing required)

All dex-scoped info calls automatically include `"dex": "<dexName>"` in the request payload.

---

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode with watch
npm run dev

# Lint
npm run lint
```

### Testing with n8n

```bash
export N8N_CUSTOM_EXTENSIONS="/path/to/n8n-nodes-hyperliquid-hip3"
n8n start
```

---

## Resources

- [Hyperliquid Documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/)
- [HIP-3 Builder-Deployed Perpetuals](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-3-builder-deployed-perpetuals)
- [Hyperliquid API Docs](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)
- [Hyperliquid Python SDK (HIP-3 examples)](https://github.com/hyperliquid-dex/hyperliquid-python-sdk)
- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
- [Standard Hyperliquid n8n Node](https://www.npmjs.com/package/n8n-nodes-hyperliquid)

---

## License

BUSL-1.1
