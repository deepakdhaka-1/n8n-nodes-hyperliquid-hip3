import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { ethers } from 'ethers';

export class HyperliquidHip3 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hyperliquid HIP3',
		name: 'hyperliquidHip3',
		icon: 'file:hyperliquid-icon.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Trade HIP3 (builder-deployed perpetuals) on Hyperliquid',
		defaults: {
			name: 'Hyperliquid HIP3',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'hyperliquidApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Place Order',
						value: 'placeOrder',
						description: 'Place a new order on a HIP3 asset',
						action: 'Place an order on HIP3 asset',
					},
					{
						name: 'Cancel Order',
						value: 'cancelOrder',
						description: 'Cancel a specific order',
						action: 'Cancel an order',
					},
					{
						name: 'Cancel All Orders',
						value: 'cancelAllOrders',
						description: 'Cancel all orders for a specific HIP3 asset',
						action: 'Cancel all orders for an asset',
					},
					{
						name: 'Get Open Orders',
						value: 'getOpenOrders',
						description: 'Retrieve all open orders',
						action: 'Get open orders',
					},
					{
						name: 'Get Positions',
						value: 'getPositions',
						description: 'Get current HIP3 positions',
						action: 'Get positions',
					},
					{
						name: 'Get Account Summary',
						value: 'getAccountSummary',
						description: 'Get account balance and margin info',
						action: 'Get account summary',
					},
					{
						name: 'Get Market Info',
						value: 'getMarketInfo',
						description: 'Fetch HIP3 market metadata',
						action: 'Get market info',
					},
					{
						name: 'Get Order Book',
						value: 'getOrderBook',
						description: 'Retrieve order book for HIP3 asset',
						action: 'Get order book',
					},
					{
						name: 'Get User Fills',
						value: 'getUserFills',
						description: 'Get historical trade fills',
						action: 'Get user fills',
					},
				],
				default: 'placeOrder',
			},

			// Place Order fields
			{
				displayName: 'HIP3 Asset',
				name: 'asset',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['placeOrder', 'cancelAllOrders', 'getOrderBook'],
					},
				},
				default: '',
				placeholder: 'xyz:XYZ100',
				description: 'HIP3 asset in format dex_name:ASSET (e.g., xyz:XYZ100)',
			},
			{
				displayName: 'Side',
				name: 'side',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						operation: ['placeOrder'],
					},
				},
				options: [
					{
						name: 'Buy',
						value: 'B',
					},
					{
						name: 'Sell',
						value: 'A',
					},
				],
				default: 'B',
				description: 'Buy (B) or Sell (A)',
			},
			{
				displayName: 'Size',
				name: 'size',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['placeOrder'],
					},
				},
				default: '',
				placeholder: '1.0',
				description: 'Order size (amount to trade)',
			},
			{
				displayName: 'Order Type',
				name: 'orderType',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						operation: ['placeOrder'],
					},
				},
				options: [
					{
						name: 'Market',
						value: 'market',
					},
					{
						name: 'Limit',
						value: 'limit',
					},
				],
				default: 'market',
				description: 'Type of order',
			},
			{
				displayName: 'Price',
				name: 'price',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['placeOrder'],
						orderType: ['limit'],
					},
				},
				default: '',
				placeholder: '100.5',
				description: 'Limit price (required for limit orders)',
			},
			{
				displayName: 'Reduce Only',
				name: 'reduceOnly',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['placeOrder'],
					},
				},
				default: false,
				description: 'Whether this order only reduces position',
			},

			// Cancel Order fields
			{
				displayName: 'Order ID',
				name: 'orderId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['cancelOrder'],
					},
				},
				default: '',
				description: 'The order ID to cancel',
			},
			{
				displayName: 'Coin',
				name: 'coin',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['cancelOrder'],
					},
				},
				default: '',
				placeholder: 'xyz:XYZ100',
				description: 'HIP3 asset for the order',
			},

			// Get User Fills fields
			{
				displayName: 'User Address',
				name: 'userAddress',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['getUserFills'],
					},
				},
				default: '',
				description: 'User address (leave empty to use credential address)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		// Get credentials
		const credentials = await this.getCredentials('hyperliquidApi');
		const privateKey = credentials.privateKey as string;
		const network = credentials.network as string;
		const vaultAddress = credentials.vaultAddress as string;
		
		const baseUrl = network === 'testnet' 
			? 'https://api.hyperliquid-testnet.xyz' 
			: 'https://api.hyperliquid.xyz';

		// Create wallet from private key
		const wallet = new ethers.Wallet(privateKey);
		const address = vaultAddress || credentials.walletAddress || wallet.address;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: any;

				if (operation === 'placeOrder') {
					const asset = this.getNodeParameter('asset', i) as string;
					const side = this.getNodeParameter('side', i) as string;
					const size = this.getNodeParameter('size', i) as string;
					const orderType = this.getNodeParameter('orderType', i) as string;
					const reduceOnly = this.getNodeParameter('reduceOnly', i, false) as boolean;

					// Validate HIP3 format
					if (!asset.includes(':')) {
						throw new NodeOperationError(
							this.getNode(),
							'HIP3 asset must be in format dex_name:ASSET (e.g., xyz:XYZ100)',
						);
					}

					let limitPx;
					if (orderType === 'limit') {
						const price = this.getNodeParameter('price', i) as string;
						if (!price) {
							throw new NodeOperationError(
								this.getNode(),
								'Price is required for limit orders',
							);
						}
						limitPx = price;
					} else {
						// For market orders, get current price
						const marketInfo = await this.helpers.request({
							method: 'POST',
							url: `${baseUrl}/info`,
							body: {
								type: 'allMids',
							},
							json: true,
						});
						
						const midPrice = marketInfo[asset];
						if (!midPrice) {
							throw new NodeOperationError(
								this.getNode(),
								`Could not find mid price for ${asset}`,
							);
						}
						// Use a price far from mid for market order
						limitPx = side === 'B' 
							? String(parseFloat(midPrice) * 1.05) 
							: String(parseFloat(midPrice) * 0.95);
					}

					const order = {
						a: 0, // asset index (will be determined by API for HIP3)
						b: side === 'B',
						p: limitPx,
						s: size,
						r: reduceOnly,
						t: {
							limit: {
								tif: orderType === 'market' ? 'Ioc' : 'Gtc',
							},
						},
						c: asset, // HIP3 asset identifier
					};

					const timestamp = Date.now();
					const action = {
						type: 'order',
						orders: [order],
						grouping: 'na',
					};

					// Create signature
					const message = {
						action,
						nonce: timestamp,
						vaultAddress: vaultAddress || undefined,
					};

					const hash = ethers.utils.keccak256(
						ethers.utils.toUtf8Bytes(JSON.stringify(message)),
					);
					const signature = await wallet.signMessage(ethers.utils.arrayify(hash));

					responseData = await this.helpers.request({
						method: 'POST',
						url: `${baseUrl}/exchange`,
						body: {
							action,
							nonce: timestamp,
							signature: {
								r: signature.slice(0, 66),
								s: '0x' + signature.slice(66, 130),
								v: parseInt(signature.slice(130, 132), 16),
							},
							vaultAddress: vaultAddress || undefined,
						},
						json: true,
					});

				} else if (operation === 'cancelOrder') {
					const orderId = this.getNodeParameter('orderId', i) as string;
					const coin = this.getNodeParameter('coin', i) as string;

					const timestamp = Date.now();
					const action = {
						type: 'cancel',
						cancels: [{
							a: 0,
							o: parseInt(orderId),
							c: coin,
						}],
					};

					const message = {
						action,
						nonce: timestamp,
						vaultAddress: vaultAddress || undefined,
					};

					const hash = ethers.utils.keccak256(
						ethers.utils.toUtf8Bytes(JSON.stringify(message)),
					);
					const signature = await wallet.signMessage(ethers.utils.arrayify(hash));

					responseData = await this.helpers.request({
						method: 'POST',
						url: `${baseUrl}/exchange`,
						body: {
							action,
							nonce: timestamp,
							signature: {
								r: signature.slice(0, 66),
								s: '0x' + signature.slice(66, 130),
								v: parseInt(signature.slice(130, 132), 16),
							},
							vaultAddress: vaultAddress || undefined,
						},
						json: true,
					});

				} else if (operation === 'cancelAllOrders') {
					const asset = this.getNodeParameter('asset', i) as string;

					const timestamp = Date.now();
					const action = {
						type: 'cancelByCloid',
						cancels: [{
							asset,
							cloid: null,
						}],
					};

					const message = {
						action,
						nonce: timestamp,
						vaultAddress: vaultAddress || undefined,
					};

					const hash = ethers.utils.keccak256(
						ethers.utils.toUtf8Bytes(JSON.stringify(message)),
					);
					const signature = await wallet.signMessage(ethers.utils.arrayify(hash));

					responseData = await this.helpers.request({
						method: 'POST',
						url: `${baseUrl}/exchange`,
						body: {
							action,
							nonce: timestamp,
							signature: {
								r: signature.slice(0, 66),
								s: '0x' + signature.slice(66, 130),
								v: parseInt(signature.slice(130, 132), 16),
							},
							vaultAddress: vaultAddress || undefined,
						},
						json: true,
					});

				} else if (operation === 'getOpenOrders') {
					responseData = await this.helpers.request({
						method: 'POST',
						url: `${baseUrl}/info`,
						body: {
							type: 'openOrders',
							user: address,
						},
						json: true,
					});

				} else if (operation === 'getPositions') {
					responseData = await this.helpers.request({
						method: 'POST',
						url: `${baseUrl}/info`,
						body: {
							type: 'clearinghouseState',
							user: address,
						},
						json: true,
					});

				} else if (operation === 'getAccountSummary') {
					responseData = await this.helpers.request({
						method: 'POST',
						url: `${baseUrl}/info`,
						body: {
							type: 'clearinghouseState',
							user: address,
						},
						json: true,
					});

				} else if (operation === 'getMarketInfo') {
					responseData = await this.helpers.request({
						method: 'POST',
						url: `${baseUrl}/info`,
						body: {
							type: 'perpDexs',
						},
						json: true,
					});

				} else if (operation === 'getOrderBook') {
					const asset = this.getNodeParameter('asset', i) as string;

					responseData = await this.helpers.request({
						method: 'POST',
						url: `${baseUrl}/info`,
						body: {
							type: 'l2Book',
							coin: asset,
						},
						json: true,
					});

				} else if (operation === 'getUserFills') {
					let userAddr = this.getNodeParameter('userAddress', i, '') as string;
					if (!userAddr) {
						userAddr = address;
					}

					responseData = await this.helpers.request({
						method: 'POST',
						url: `${baseUrl}/info`,
						body: {
							type: 'userFills',
							user: userAddr,
						},
						json: true,
					});
				}

				returnData.push({
					json: responseData,
					pairedItem: { item: i },
				});

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
