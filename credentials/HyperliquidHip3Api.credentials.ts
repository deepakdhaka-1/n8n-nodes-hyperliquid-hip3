import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class HyperliquidHip3Api implements ICredentialType {
  name = 'hyperliquidHip3Api';
  displayName = 'Hyperliquid HIP-3 API';
  documentationUrl = 'https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-3-builder-deployed-perpetuals';

  properties: INodeProperties[] = [
    {
      displayName: 'DEX Name',
      name: 'dexName',
      type: 'string',
      default: 'xyz',
      required: true,
      placeholder: 'xyz',
      description: 'The builder-deployed perp DEX identifier (e.g. "xyz"). Assets will be prefixed automatically as "dex:ASSET".',
    },
    {
      displayName: 'Wallet Type',
      name: 'walletType',
      type: 'options',
      options: [
        {
          name: 'API Wallet (Agent)',
          value: 'agent',
          description: 'Delegated wallet — can only trade, cannot withdraw (recommended)',
        },
        {
          name: 'Main Wallet',
          value: 'main',
          description: 'Full access wallet — can trade and withdraw',
        },
      ],
      default: 'agent',
      description: 'API wallets are recommended for automated trading as they cannot withdraw funds',
    },
    {
      displayName: 'Private Key',
      name: 'privateKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      placeholder: '0x...',
      description: 'Wallet private key (64 hex characters with 0x prefix). Encrypted at rest using AES-256.',
      hint: 'For API wallets, use the agent private key. For main wallets, use your main wallet key.',
    },
    {
      displayName: 'Master Wallet Address',
      name: 'masterAddress',
      type: 'string',
      default: '',
      placeholder: '0x...',
      displayOptions: {
        show: {
          walletType: ['agent'],
        },
      },
      required: true,
      description: 'The master account address that authorized this API wallet',
    },
    {
      displayName: 'Network',
      name: 'network',
      type: 'options',
      options: [
        { name: 'Mainnet', value: 'mainnet' },
        { name: 'Testnet', value: 'testnet' },
      ],
      default: 'mainnet',
      description: 'Hyperliquid network to connect to',
    },
    {
      displayName: 'Vault Address (Optional)',
      name: 'vaultAddress',
      type: 'string',
      default: '',
      placeholder: '0x... (leave empty for main account)',
      description: 'For subaccount/vault trading, enter the vault address',
    },
  ];
}
