import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HyperliquidApi implements ICredentialType {
	name = 'hyperliquidApi';
	displayName = 'Hyperliquid API';
	documentationUrl = 'https://hyperliquid.gitbook.io/hyperliquid-docs/';
	properties: INodeProperties[] = [
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'Your Hyperliquid wallet private key (without 0x prefix)',
			placeholder: 'abc123...',
		},
		{
			displayName: 'Wallet Address',
			name: 'walletAddress',
			type: 'string',
			default: '',
			description: 'Optional: Your wallet address. If empty, will be derived from private key.',
			placeholder: '0x...',
		},
		{
			displayName: 'Network',
			name: 'network',
			type: 'options',
			options: [
				{
					name: 'Mainnet',
					value: 'mainnet',
				},
				{
					name: 'Testnet',
					value: 'testnet',
				},
			],
			default: 'mainnet',
			description: 'The Hyperliquid network to connect to',
		},
		{
			displayName: 'Vault Address',
			name: 'vaultAddress',
			type: 'string',
			default: '',
			description: 'Optional: Vault or subaccount address if trading on behalf of a vault',
			placeholder: '0x...',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.network === "testnet" ? "https://api.hyperliquid-testnet.xyz" : "https://api.hyperliquid.xyz"}}',
			url: '/info',
			method: 'POST',
			body: {
				type: 'meta',
			},
		},
	};
}
