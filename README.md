# n8n-nodes-hyperliquid-hip3

This is an n8n community node for trading HIP3 (builder-deployed perpetuals) assets on Hyperliquid.

[n8n](https://n8n.io/) is a workflow automation platform that allows you to connect various services and automate tasks.

[Hyperliquid](https://hyperliquid.xyz) is a decentralized Layer 1 blockchain with fully onchain order books.

[HIP3](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-3-builder-deployed-perpetuals) enables permissionless builder-deployed perpetual markets on Hyperliquid.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

### Using npm

```bash
npm install n8n-nodes-hyperliquid-hip3
```

### Manual Installation (for development)

```bash
# Clone the repository
git clone https://github.com/yourusername/n8n-nodes-hyperliquid-hip3.git
cd n8n-nodes-hyperliquid-hip3

# Install dependencies
npm install

# Build the node
npm run build

# Link for local testing
npm link

# In your n8n custom folder
cd ~/.n8n/custom
npm link n8n-nodes-hyperliquid-hip3
```

## Prerequisites

- n8n installed (self-hosted or cloud)
- Hyperliquid wallet with private key
- Understanding of HIP3 asset format: `dex_name:ASSET` (e.g., `xyz:XYZ100`)

## Credentials

This node requires Hyperliquid API credentials with the following information:

- **Private Key**: Your Hyperliquid wallet private key (without 0x prefix)
- **Wallet Address** (optional): Your wallet address (auto-derived if not provided)
- **Network**: Choose between Mainnet or Testnet
- **Vault Address** (optional): If trading on behalf of a vault or subaccount

## Operations

### Place Order
Place a new order on a HIP3 perpetual market.

**Parameters:**
- HIP3 Asset: Asset identifier (e.g., `xyz:XYZ100`)
- Side: Buy (B) or Sell (A)
- Size: Order size
- Order Type: Market or Limit
- Price: Required for limit orders
- Reduce Only: Whether order only reduces position

### Cancel Order
Cancel a specific order by order ID.

**Parameters:**
- Order ID: The ID of the order to cancel
- Coin: HIP3 asset of the order

### Cancel All Orders
Cancel all orders for a specific HIP3 asset.

**Parameters:**
- HIP3 Asset: Asset to cancel all orders for

### Get Open Orders
Retrieve all open orders for your account.

**Returns:** Array of open orders with details

### Get Positions
Get current HIP3 positions.

**Returns:** Current positions with entry price, size, PnL, etc.

### Get Account Summary
Get account balance and margin information.

**Returns:** Account value, margin used, withdrawable balance

### Get Market Info
Fetch metadata about all HIP3 perpetual dexs.

**Returns:** List of HIP3 dexs with their assets and configuration

### Get Order Book
Retrieve the order book for a specific HIP3 asset.

**Parameters:**
- HIP3 Asset: Asset to get order book for

**Returns:** Bids and asks with prices and sizes

### Get User Fills
Get historical trade fills.

**Parameters:**
- User Address (optional): Address to get fills for (defaults to credential address)

**Returns:** Array of historical fills

## Usage Example

### Basic Trading Workflow

1. **Get Market Info** to see available HIP3 dexs and assets
2. **Get Order Book** to check current prices
3. **Place Order** to enter a position
4. **Get Positions** to monitor your position
5. **Cancel Order** or **Cancel All Orders** if needed

### Example: Automated Trading Bot

```
Trigger (Schedule) → Get Order Book → If (Price Condition) → Place Order → Get Positions
```

## HIP3 Important Notes

### Asset Format
HIP3 assets **must** use the format `dex_name:ASSET`:
- ✅ Correct: `xyz:XYZ100`
- ❌ Wrong: `XYZ100`
- ❌ Wrong: `BTC` (this is standard perp, not HIP3)

### Key Differences from Standard Perpetuals

1. **Isolated Margin Only**: HIP3 markets require isolated margin mode
2. **Higher Fees**: Trading fees are 2x standard perpetuals (protocol still receives same amount)
3. **Custom Oracles**: HIP3 deployers set their own oracle prices
4. **DEX Prefix**: Always include the DEX name prefix (e.g., `xyz:`)
5. **Builder-Deployed**: These are community-created markets, not validator-operated

### Finding HIP3 Assets

Use the **Get Market Info** operation to retrieve all available HIP3 dexs and their assets:

```json
{
  "perpDexs": [
    [null, { "name": "first dex", ... }],
    ["xyz", { "name": "XYZ Dex", "assets": ["XYZ100", "XYZ200"], ... }]
  ]
}
```

The DEX name (e.g., "xyz") is used as the prefix for all assets in that DEX.

## API Endpoints

- **Mainnet**: `https://api.hyperliquid.xyz`
- **Testnet**: `https://api.hyperliquid-testnet.xyz`

## Security Best Practices

⚠️ **Security Warnings:**

1. **Never share your private key** or commit it to version control
2. **Use API Wallets** for production environments when possible
3. **Test on testnet first** before using mainnet
4. **Start with small amounts** when testing live
5. **Monitor your positions** regularly
6. **Understand HIP3 risks** including oracle manipulation and lower liquidity

## Troubleshooting

### "Asset must be in format dex_name:ASSET"
Make sure you're using the HIP3 format with the DEX prefix (e.g., `xyz:XYZ100`), not just the asset name.

### "Could not find mid price"
The asset might not exist or might not have any orders. Check the asset name and verify it exists using **Get Market Info**.

### "Insufficient margin"
Your account doesn't have enough balance. Deposit funds or reduce order size.

### Orders not executing
- For market orders: Check if there's sufficient liquidity
- For limit orders: Verify price is within reasonable bounds
- Ensure you're not in reduce-only mode when trying to increase position

## Resources

- [Hyperliquid Documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/)
- [HIP-3 Specification](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-3-builder-deployed-perpetuals)
- [Hyperliquid API Reference](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api)
- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/n8n-nodes-hyperliquid-hip3/issues)
- **n8n Community**: [n8n Community Forum](https://community.n8n.io)
- **Hyperliquid**: [Hyperliquid Discord](https://discord.gg/hyperliquid)

## Development

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Testing Locally

```bash
npm run dev
```

This starts n8n with your node automatically loaded.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

[MIT](LICENSE.md)

## Disclaimer

This node is provided as-is. Trading cryptocurrencies involves substantial risk of loss. The authors are not responsible for any financial losses incurred through the use of this software. Always do your own research and never trade with funds you cannot afford to lose.

HIP3 markets are builder-deployed and carry additional risks including:
- Custom oracle manipulation
- Lower liquidity
- Unaudited smart contracts
- Higher fees

Use at your own risk.

## Version History

### 1.0.0
- Initial release
- Support for all basic HIP3 trading operations
- Mainnet and testnet support
- Comprehensive error handling

---

**Made with ❤️ for the n8n and Hyperliquid communities**
