import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';
import { HyperliquidHip3Client } from './transport/hyperliquidHip3Client';
import {
  HyperliquidOrderWire,
  OrderTypeWire,
  Meta,
  ClearinghouseState,
  AssetPosition,
} from './types';

export class HyperliquidHip3 implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Hyperliquid HIP-3',
    name: 'hyperliquidHip3',
    icon: 'file:hyperliquidHip3.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Trade builder-deployed HIP-3 perpetual assets on Hyperliquid (e.g. xyz:XYZ100)',
    defaults: {
      name: 'Hyperliquid HIP-3',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        // Completely separate credential — no link to the base hyperliquidApi
        name: 'hyperliquidHip3Api',
        required: true,
      },
    ],
    properties: [
      // ---------------------------------------------------------------- notice
      {
        displayName:
          '⚠️ This node trades HIP-3 builder-deployed perpetuals only (e.g. xyz:XYZ100). ' +
          'Assets are automatically prefixed with the DEX name configured in credentials. ' +
          'For standard Hyperliquid perpetuals use the Hyperliquid node instead.',
        name: 'hip3Notice',
        type: 'notice',
        default: '',
      },

      // -------------------------------------------------------------- resource
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Order', value: 'order' },
          { name: 'Position', value: 'position' },
          { name: 'Account', value: 'account' },
          { name: 'Market Data', value: 'marketData' },
        ],
        default: 'order',
      },

      // ================================================================ ORDER
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['order'] } },
        options: [
          { name: 'Place Market Order', value: 'marketOrder', action: 'Place market order' },
          { name: 'Place Limit Order', value: 'limitOrder', action: 'Place limit order' },
          { name: 'Place Take Profit', value: 'takeProfit', action: 'Place take profit order' },
          { name: 'Place Stop Loss', value: 'stopLoss', action: 'Place stop loss order' },
          { name: 'Modify Order', value: 'modifyOrder', action: 'Modify existing order' },
          { name: 'Cancel Order', value: 'cancel', action: 'Cancel order by ID' },
          { name: 'Cancel by Client ID', value: 'cancelByCloid', action: 'Cancel order by client ID' },
          { name: 'Cancel All Orders', value: 'cancelAll', action: 'Cancel all orders on this DEX' },
          { name: 'Schedule Cancel', value: 'scheduleCancel', action: 'Schedule cancel all orders' },
          { name: 'Get Open Orders', value: 'getOpen', action: 'Get open orders on this DEX' },
          { name: 'Get Order Status', value: 'getOrderStatus', action: 'Get order status by ID' },
          { name: 'Get Order History', value: 'getHistory', action: 'Get fill history' },
          { name: 'Get Historical Orders', value: 'getHistoricalOrders', action: 'Get all historical orders' },
        ],
        default: 'limitOrder',
      },

      // ---- common order fields
      {
        displayName: 'Asset Symbol',
        name: 'asset',
        type: 'string',
        default: 'XYZ100',
        placeholder: 'XYZ100, ABC...',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['marketOrder', 'limitOrder', 'takeProfit', 'stopLoss', 'cancel', 'cancelByCloid', 'modifyOrder'],
          },
        },
        description:
          'Asset symbol WITHOUT the dex prefix — the DEX prefix from credentials is added automatically. E.g. enter "XYZ100" and it becomes "xyz:XYZ100".',
      },
      {
        displayName: 'Side',
        name: 'side',
        type: 'options',
        options: [
          { name: 'Buy / Long', value: 'buy' },
          { name: 'Sell / Short', value: 'sell' },
        ],
        default: 'buy',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['marketOrder', 'limitOrder', 'takeProfit', 'stopLoss', 'modifyOrder'],
          },
        },
      },
      {
        displayName: 'Size',
        name: 'size',
        type: 'number',
        default: 1,
        typeOptions: { minValue: 0, numberPrecision: 8 },
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['marketOrder', 'limitOrder', 'takeProfit', 'stopLoss', 'modifyOrder'],
          },
        },
        description: 'Order size in base asset units',
      },
      {
        displayName: 'Price',
        name: 'price',
        type: 'number',
        default: 0,
        typeOptions: { numberPrecision: 6 },
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['limitOrder', 'modifyOrder'],
          },
        },
        description: 'Limit price for the order',
      },
      {
        displayName: 'Slippage %',
        name: 'slippage',
        type: 'number',
        default: 0.5,
        typeOptions: { minValue: 0.1, maxValue: 10 },
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['marketOrder'],
          },
        },
        description: 'Maximum slippage tolerance for market orders',
      },
      {
        displayName: 'Trigger Price',
        name: 'triggerPrice',
        type: 'number',
        default: 0,
        typeOptions: { numberPrecision: 6 },
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['takeProfit', 'stopLoss'],
          },
        },
        description: 'Price at which the TP/SL order triggers',
      },
      {
        displayName: 'Time In Force',
        name: 'timeInForce',
        type: 'options',
        options: [
          { name: 'Good Til Canceled (GTC)', value: 'Gtc' },
          { name: 'Immediate Or Cancel (IOC)', value: 'Ioc' },
          { name: 'Post Only (ALO)', value: 'Alo' },
        ],
        default: 'Gtc',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['limitOrder', 'modifyOrder'],
          },
        },
      },
      {
        displayName: 'Reduce Only',
        name: 'reduceOnly',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['limitOrder', 'marketOrder', 'modifyOrder'],
          },
        },
        description: 'Whether order can only reduce an existing position',
      },
      {
        displayName: 'Order ID',
        name: 'orderId',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['cancel', 'modifyOrder', 'getOrderStatus'],
          },
        },
        description: 'The order ID to cancel, modify, or look up',
      },
      {
        displayName: 'Client Order ID',
        name: 'clientOrderId',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['cancelByCloid'],
          },
        },
        description: 'The client-assigned order ID (cloid) to cancel',
      },
      {
        displayName: 'Cancel Time',
        name: 'cancelTime',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['order'],
            operation: ['scheduleCancel'],
          },
        },
        description:
          'Unix timestamp (ms) to cancel all orders. Set to 0 to remove scheduled cancel. Must be at least 5 seconds in the future.',
      },

      // ============================================================= POSITION
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['position'] } },
        options: [
          { name: 'Get Open Positions', value: 'getPositions', action: 'Get open positions on this DEX' },
          { name: 'Close Position', value: 'closePosition', action: 'Close position with market order' },
          { name: 'Update Leverage', value: 'updateLeverage', action: 'Update leverage' },
          { name: 'Update Isolated Margin', value: 'updateIsolatedMargin', action: 'Update isolated margin' },
          { name: 'Get Trade History', value: 'getTradeHistory', action: 'Get trade history' },
        ],
        default: 'getPositions',
      },
      {
        displayName: 'Asset Symbol',
        name: 'positionAsset',
        type: 'string',
        default: 'XYZ100',
        placeholder: 'XYZ100...',
        displayOptions: {
          show: {
            resource: ['position'],
            operation: ['updateLeverage', 'updateIsolatedMargin', 'closePosition'],
          },
        },
        description:
          'Asset symbol WITHOUT dex prefix — prefix is added automatically from credentials.',
      },
      {
        displayName: 'Slippage %',
        name: 'closeSlippage',
        type: 'number',
        default: 0.5,
        typeOptions: { minValue: 0.1, maxValue: 10 },
        displayOptions: {
          show: {
            resource: ['position'],
            operation: ['closePosition'],
          },
        },
        description: 'Maximum slippage tolerance for close position market order',
      },
      {
        displayName: 'Leverage',
        name: 'leverage',
        type: 'number',
        default: 5,
        typeOptions: { minValue: 1, maxValue: 100 },
        displayOptions: {
          show: {
            resource: ['position'],
            operation: ['updateLeverage'],
          },
        },
        description: 'Note: many HIP-3 assets are isolated-only. Check asset metadata for max leverage.',
      },
      {
        displayName: 'Margin Mode',
        name: 'marginMode',
        type: 'options',
        options: [
          { name: 'Cross', value: 'cross' },
          { name: 'Isolated', value: 'isolated' },
        ],
        default: 'isolated',
        displayOptions: {
          show: {
            resource: ['position'],
            operation: ['updateLeverage'],
          },
        },
        description: 'Many HIP-3 assets are isolated-margin only (onlyIsolated: true)',
      },
      {
        displayName: 'Position Side',
        name: 'positionSide',
        type: 'options',
        options: [
          { name: 'Long', value: 'long' },
          { name: 'Short', value: 'short' },
        ],
        default: 'long',
        displayOptions: {
          show: {
            resource: ['position'],
            operation: ['updateIsolatedMargin'],
          },
        },
      },
      {
        displayName: 'Margin Delta',
        name: 'marginDelta',
        type: 'number',
        default: 0,
        typeOptions: { numberPrecision: 2 },
        displayOptions: {
          show: {
            resource: ['position'],
            operation: ['updateIsolatedMargin'],
          },
        },
        description: 'Amount to add (positive) or remove (negative) from isolated margin in USD',
      },

      // ============================================================== ACCOUNT
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['account'] } },
        options: [
          { name: 'Get Balance', value: 'getBalance', action: 'Get account balance for this DEX' },
          { name: 'Get Margin Summary', value: 'getMarginSummary', action: 'Get margin summary for this DEX' },
          { name: 'Get User Funding', value: 'getUserFunding', action: 'Get user funding history' },
          { name: 'Get User Fees', value: 'getUserFees', action: 'Get user fee rates' },
        ],
        default: 'getBalance',
      },
      {
        displayName: 'Start Time',
        name: 'fundingStartTime',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['account'],
            operation: ['getUserFunding'],
          },
        },
        description: 'Start timestamp in milliseconds for funding history',
      },
      {
        displayName: 'End Time',
        name: 'fundingEndTime',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['account'],
            operation: ['getUserFunding'],
          },
        },
        description: 'End timestamp in milliseconds (0 = now)',
      },

      // =========================================================== MARKET DATA
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['marketData'] } },
        options: [
          { name: 'Get All Prices', value: 'getAllMids', action: 'Get all mid prices on this DEX' },
          { name: 'Get Asset Price', value: 'getAssetPrice', action: 'Get price for a specific asset' },
          { name: 'Get Asset Metadata', value: 'getMeta', action: 'Get DEX asset metadata (szDecimals, maxLeverage, onlyIsolated)' },
          { name: 'Get Meta And Asset Contexts', value: 'getMetaAndAssetCtxs', action: 'Get metadata with mark price, OI, funding' },
          { name: 'Get Order Book', value: 'getOrderBook', action: 'Get L2 order book' },
          { name: 'Get Candle Snapshot', value: 'getCandleSnapshot', action: 'Get OHLCV candle history' },
          { name: 'Get Funding History', value: 'getFundingHistory', action: 'Get historical funding rates' },
          { name: 'Get Predicted Fundings', value: 'getPredictedFundings', action: 'Get predicted funding rates' },
          { name: 'Get Recent Trades', value: 'getRecentTrades', action: 'Get recent trades' },
          { name: 'List All DEXes', value: 'getPerpDexs', action: 'List all available HIP-3 DEXes' },
          { name: 'Get DEX Limits', value: 'getPerpDexLimits', action: 'Get perp DEX limits and caps' },
        ],
        default: 'getAllMids',
      },
      {
        displayName: 'Asset Symbol',
        name: 'marketAsset',
        type: 'string',
        default: 'XYZ100',
        placeholder: 'XYZ100...',
        displayOptions: {
          show: {
            resource: ['marketData'],
            operation: ['getAssetPrice', 'getOrderBook', 'getCandleSnapshot', 'getFundingHistory', 'getRecentTrades'],
          },
        },
        description: 'Asset symbol WITHOUT dex prefix — prefix is added automatically.',
      },
      {
        displayName: 'Interval',
        name: 'candleInterval',
        type: 'options',
        options: [
          { name: '1 Minute', value: '1m' },
          { name: '3 Minutes', value: '3m' },
          { name: '5 Minutes', value: '5m' },
          { name: '15 Minutes', value: '15m' },
          { name: '30 Minutes', value: '30m' },
          { name: '1 Hour', value: '1h' },
          { name: '2 Hours', value: '2h' },
          { name: '4 Hours', value: '4h' },
          { name: '8 Hours', value: '8h' },
          { name: '12 Hours', value: '12h' },
          { name: '1 Day', value: '1d' },
          { name: '3 Days', value: '3d' },
          { name: '1 Week', value: '1w' },
          { name: '1 Month', value: '1M' },
        ],
        default: '1h',
        displayOptions: {
          show: {
            resource: ['marketData'],
            operation: ['getCandleSnapshot'],
          },
        },
      },
      {
        displayName: 'Start Time',
        name: 'candleStartTime',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['marketData'],
            operation: ['getCandleSnapshot', 'getFundingHistory'],
          },
        },
        description: 'Start timestamp in milliseconds',
      },
      {
        displayName: 'End Time',
        name: 'candleEndTime',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['marketData'],
            operation: ['getCandleSnapshot', 'getFundingHistory'],
          },
        },
        description: 'End timestamp in milliseconds (0 = now)',
      },
    ],
  };

  // ================================================================= EXECUTE

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // ---- credentials
    const credentials = await this.getCredentials('hyperliquidHip3Api');
    const privateKey = credentials.privateKey as string;
    const network = credentials.network as string;
    const walletType = credentials.walletType as string;
    const masterAddress = credentials.masterAddress as string;
    const vaultAddress = credentials.vaultAddress as string;
    const dexName = (credentials.dexName as string).toLowerCase().trim();

    if (!privateKey.match(/^0x[a-fA-F0-9]{64}$/)) {
      throw new NodeOperationError(
        this.getNode(),
        'Invalid private key format. Must be 64 hex characters with 0x prefix.',
      );
    }

    if (!dexName) {
      throw new NodeOperationError(
        this.getNode(),
        'DEX Name is required in credentials. Enter the builder-deployed DEX identifier (e.g. "xyz").',
      );
    }

    // ---- client
    const client = new HyperliquidHip3Client(
      privateKey,
      dexName,
      network === 'mainnet',
      walletType === 'agent' ? masterAddress : undefined,
      vaultAddress || undefined,
    );

    // ---- fetch DEX metadata once for asset index lookups
    let meta: Meta;
    try {
      meta = await client.getMeta();
    } catch (error) {
      throw new NodeOperationError(
        this.getNode(),
        `Failed to fetch HIP-3 DEX metadata for "${dexName}": ${error}. ` +
        'Check that the DEX name is correct and the network is reachable.',
      );
    }

    // ---- helpers

    /**
     * Resolve asset index from symbol.
     * Accepts both bare symbol ("XYZ100") and prefixed ("xyz:XYZ100").
     * Meta names from HIP-3 are stored as "dex:SYMBOL" in universe.
     */
    const getAssetIndex = (symbol: string): number => {
      const coin = client.formatCoin(symbol); // ensures "dex:SYMBOL"
      const index = meta.universe.findIndex(
        (asset) => asset.name.toUpperCase() === coin.toUpperCase(),
      );
      if (index === -1) {
        const available = meta.universe.map((a) => a.name).join(', ');
        throw new NodeOperationError(
          this.getNode(),
          `Unknown asset "${coin}" on DEX "${dexName}". Available: ${available}`,
        );
      }
      return index;
    };

    const formatNumber = (value: number): string =>
      value.toFixed(8).replace(/\.?0+$/, '');

    const formatPrice = (price: number): string => {
      if (!price || isNaN(price)) return '0';
      const MAX_SIG_FIGS = 5;
      if (price >= 10000) {
        const intPart = Math.floor(price);
        const intDigits = intPart.toString().length;
        if (intDigits >= MAX_SIG_FIGS) {
          const factor = Math.pow(10, intDigits - MAX_SIG_FIGS);
          return (Math.round(price / factor) * factor).toString();
        }
        return price.toFixed(MAX_SIG_FIGS - intDigits);
      }
      const formatted = parseFloat(price.toPrecision(MAX_SIG_FIGS));
      const decimalPlaces = (formatted.toString().split('.')[1] || '').length;
      if (decimalPlaces > 6) return formatted.toFixed(6);
      return formatted.toString();
    };

    // ================================================================ LOOP
    for (let i = 0; i < items.length; i++) {
      try {
        const resource = this.getNodeParameter('resource', i) as string;
        const operation = this.getNodeParameter('operation', i) as string;

        let result: unknown;

        // ============================================================== ORDER
        if (resource === 'order') {

          if (operation === 'marketOrder') {
            const symbol = this.getNodeParameter('asset', i) as string;
            const side = this.getNodeParameter('side', i) as string;
            const size = this.getNodeParameter('size', i) as number;
            const slippage = this.getNodeParameter('slippage', i) as number;
            const reduceOnly = this.getNodeParameter('reduceOnly', i) as boolean;

            const coin = client.formatCoin(symbol);
            const mids = await client.getAllMids();
            const midPrice = parseFloat(mids[coin]);
            if (!midPrice) {
              throw new NodeOperationError(this.getNode(), `No price found for ${coin} on DEX "${dexName}"`);
            }

            const slippageMultiplier = side === 'buy' ? 1 + slippage / 100 : 1 - slippage / 100;
            const price = midPrice * slippageMultiplier;

            const order: HyperliquidOrderWire = {
              a: getAssetIndex(symbol),
              b: side === 'buy',
              p: formatPrice(price),
              s: formatNumber(size),
              r: reduceOnly,
              t: { limit: { tif: 'Ioc' } },
            };

            result = await client.exchange({ type: 'order', orders: [order], grouping: 'na' });
          }

          if (operation === 'limitOrder') {
            const symbol = this.getNodeParameter('asset', i) as string;
            const side = this.getNodeParameter('side', i) as string;
            const size = this.getNodeParameter('size', i) as number;
            const limitPrice = this.getNodeParameter('price', i) as number;
            const tif = this.getNodeParameter('timeInForce', i) as 'Gtc' | 'Ioc' | 'Alo';
            const reduceOnly = this.getNodeParameter('reduceOnly', i) as boolean;

            const order: HyperliquidOrderWire = {
              a: getAssetIndex(symbol),
              b: side === 'buy',
              p: formatPrice(limitPrice),
              s: formatNumber(size),
              r: reduceOnly,
              t: { limit: { tif } },
            };

            result = await client.exchange({ type: 'order', orders: [order], grouping: 'na' });
          }

          if (operation === 'takeProfit' || operation === 'stopLoss') {
            const symbol = this.getNodeParameter('asset', i) as string;
            const side = this.getNodeParameter('side', i) as string;
            const size = this.getNodeParameter('size', i) as number;
            const triggerPrice = this.getNodeParameter('triggerPrice', i) as number;

            const orderType: OrderTypeWire = {
              trigger: {
                isMarket: true,
                triggerPx: formatPrice(triggerPrice),
                tpsl: operation === 'takeProfit' ? 'tp' : 'sl',
              },
            };

            const order: HyperliquidOrderWire = {
              a: getAssetIndex(symbol),
              b: side === 'buy',
              p: formatPrice(triggerPrice),
              s: formatNumber(size),
              r: true,
              t: orderType,
            };

            result = await client.exchange({ type: 'order', orders: [order], grouping: 'na' });
          }

          if (operation === 'modifyOrder') {
            const symbol = this.getNodeParameter('asset', i) as string;
            const orderId = this.getNodeParameter('orderId', i) as number;
            const side = this.getNodeParameter('side', i) as string;
            const size = this.getNodeParameter('size', i) as number;
            const limitPrice = this.getNodeParameter('price', i) as number;
            const tif = this.getNodeParameter('timeInForce', i) as 'Gtc' | 'Ioc' | 'Alo';
            const reduceOnly = this.getNodeParameter('reduceOnly', i) as boolean;

            const order: HyperliquidOrderWire = {
              a: getAssetIndex(symbol),
              b: side === 'buy',
              p: formatPrice(limitPrice),
              s: formatNumber(size),
              r: reduceOnly,
              t: { limit: { tif } },
            };

            result = await client.exchange({ type: 'modify', oid: orderId, order });
          }

          if (operation === 'cancel') {
            const symbol = this.getNodeParameter('asset', i) as string;
            const orderId = this.getNodeParameter('orderId', i) as number;

            result = await client.exchange({
              type: 'cancel',
              cancels: [{ a: getAssetIndex(symbol), o: orderId }],
            });
          }

          if (operation === 'cancelByCloid') {
            const symbol = this.getNodeParameter('asset', i) as string;
            const clientOrderId = this.getNodeParameter('clientOrderId', i) as string;

            result = await client.exchange({
              type: 'cancelByCloid',
              cancels: [{ asset: getAssetIndex(symbol), cloid: clientOrderId }],
            });
          }

          if (operation === 'cancelAll') {
            const openOrders = await client.getOpenOrders() as Array<{ coin: string; oid: number }>;
            if (openOrders.length === 0) {
              result = { message: `No open orders on DEX "${dexName}"` };
            } else {
              const cancels = openOrders.map((order) => ({
                a: getAssetIndex(order.coin),
                o: order.oid,
              }));
              result = await client.exchange({ type: 'cancel', cancels });
            }
          }

          if (operation === 'scheduleCancel') {
            const cancelTime = this.getNodeParameter('cancelTime', i) as number;
            result = await client.exchange({
              type: 'scheduleCancel',
              time: cancelTime === 0 ? null : cancelTime,
            });
          }

          if (operation === 'getOpen') {
            result = await client.getOpenOrders();
          }

          if (operation === 'getOrderStatus') {
            const orderId = this.getNodeParameter('orderId', i) as number;
            result = await client.getOrderStatus(orderId);
          }

          if (operation === 'getHistory') {
            result = await client.getUserFills();
          }

          if (operation === 'getHistoricalOrders') {
            result = await client.getHistoricalOrders();
          }
        }

        // =========================================================== POSITION
        if (resource === 'position') {

          if (operation === 'getPositions') {
            const state = await client.getClearinghouseState() as ClearinghouseState;
            // Filter to only non-zero positions
            result = state.assetPositions.filter(
              (pos: AssetPosition) => parseFloat(pos.position.szi) !== 0,
            );
          }

          if (operation === 'closePosition') {
            const symbol = this.getNodeParameter('positionAsset', i) as string;
            const slippage = this.getNodeParameter('closeSlippage', i) as number;
            const coin = client.formatCoin(symbol);

            const state = await client.getClearinghouseState() as ClearinghouseState;
            const position = state.assetPositions.find(
              (pos: AssetPosition) => pos.position.coin.toUpperCase() === coin.toUpperCase(),
            );

            if (!position || parseFloat(position.position.szi) === 0) {
              throw new NodeOperationError(
                this.getNode(),
                `No open position found for ${coin} on DEX "${dexName}"`,
              );
            }

            const positionSize = parseFloat(position.position.szi);
            const isLong = positionSize > 0;
            const size = Math.abs(positionSize);

            const mids = await client.getAllMids();
            const midPrice = parseFloat(mids[coin]);
            if (!midPrice) {
              throw new NodeOperationError(this.getNode(), `No price found for ${coin}`);
            }

            const slippageMultiplier = isLong ? 1 - slippage / 100 : 1 + slippage / 100;
            const price = midPrice * slippageMultiplier;

            const order: HyperliquidOrderWire = {
              a: getAssetIndex(symbol),
              b: !isLong,
              p: formatPrice(price),
              s: formatNumber(size),
              r: true,
              t: { limit: { tif: 'Ioc' } },
            };

            result = await client.exchange({ type: 'order', orders: [order], grouping: 'na' });
          }

          if (operation === 'updateLeverage') {
            const symbol = this.getNodeParameter('positionAsset', i) as string;
            const leverage = this.getNodeParameter('leverage', i) as number;
            const marginMode = this.getNodeParameter('marginMode', i) as string;

            // Warn if trying cross on an onlyIsolated asset
            const coin = client.formatCoin(symbol);
            const assetMeta = meta.universe.find(
              (a) => a.name.toUpperCase() === coin.toUpperCase(),
            );
            if (assetMeta?.onlyIsolated && marginMode === 'cross') {
              throw new NodeOperationError(
                this.getNode(),
                `Asset ${coin} on DEX "${dexName}" only supports isolated margin. Switch Margin Mode to Isolated.`,
              );
            }

            result = await client.exchange({
              type: 'updateLeverage',
              asset: getAssetIndex(symbol),
              isCross: marginMode === 'cross',
              leverage,
            });
          }

          if (operation === 'updateIsolatedMargin') {
            const symbol = this.getNodeParameter('positionAsset', i) as string;
            const positionSide = this.getNodeParameter('positionSide', i) as string;
            const marginDelta = this.getNodeParameter('marginDelta', i) as number;

            result = await client.exchange({
              type: 'updateIsolatedMargin',
              asset: getAssetIndex(symbol),
              isBuy: positionSide === 'long',
              ntli: marginDelta,
            });
          }

          if (operation === 'getTradeHistory') {
            result = await client.getUserFills();
          }
        }

        // ============================================================ ACCOUNT
        if (resource === 'account') {

          if (operation === 'getBalance' || operation === 'getMarginSummary') {
            const state = await client.getClearinghouseState() as ClearinghouseState;

            if (operation === 'getBalance') {
              result = {
                dex: dexName,
                accountValue: state.marginSummary.accountValue,
                totalRawUsd: state.marginSummary.totalRawUsd,
                withdrawable: state.withdrawable,
              };
            } else {
              result = { dex: dexName, ...state.marginSummary };
            }
          }

          if (operation === 'getUserFunding') {
            const startTime = this.getNodeParameter('fundingStartTime', i) as number;
            const endTime = this.getNodeParameter('fundingEndTime', i) as number;
            result = await client.getUserFunding(startTime, endTime || undefined);
          }

          if (operation === 'getUserFees') {
            result = await client.getUserFees();
          }
        }

        // ========================================================= MARKET DATA
        if (resource === 'marketData') {

          if (operation === 'getAllMids') {
            result = await client.getAllMids();
          }

          if (operation === 'getAssetPrice') {
            const symbol = this.getNodeParameter('marketAsset', i) as string;
            const coin = client.formatCoin(symbol);
            const mids = await client.getAllMids();
            result = {
              dex: dexName,
              asset: coin,
              price: mids[coin] ?? null,
            };
          }

          if (operation === 'getMeta') {
            result = meta; // already fetched with dex param
          }

          if (operation === 'getMetaAndAssetCtxs') {
            result = await client.getMetaAndAssetCtxs();
          }

          if (operation === 'getOrderBook') {
            const symbol = this.getNodeParameter('marketAsset', i) as string;
            const coin = client.formatCoin(symbol);
            result = await client.info({ type: 'l2Book', coin });
          }

          if (operation === 'getCandleSnapshot') {
            const symbol = this.getNodeParameter('marketAsset', i) as string;
            const coin = client.formatCoin(symbol);
            const interval = this.getNodeParameter('candleInterval', i) as string;
            const startTime = this.getNodeParameter('candleStartTime', i) as number;
            const endTime = this.getNodeParameter('candleEndTime', i) as number;

            result = await client.getCandleSnapshot(coin, interval, startTime, endTime || Date.now());
          }

          if (operation === 'getFundingHistory') {
            const symbol = this.getNodeParameter('marketAsset', i) as string;
            const coin = client.formatCoin(symbol);
            const startTime = this.getNodeParameter('candleStartTime', i) as number;
            const endTime = this.getNodeParameter('candleEndTime', i) as number;

            result = await client.getFundingHistory(coin, startTime, endTime || undefined);
          }

          if (operation === 'getPredictedFundings') {
            result = await client.getPredictedFundings();
          }

          if (operation === 'getRecentTrades') {
            const symbol = this.getNodeParameter('marketAsset', i) as string;
            const coin = client.formatCoin(symbol);
            result = await client.getRecentTrades(coin);
          }

          if (operation === 'getPerpDexs') {
            result = await client.getPerpDexs();
          }

          if (operation === 'getPerpDexLimits') {
            result = await client.getPerpDexLimits();
          }
        }

        returnData.push({
          json: result as INodeExecutionData['json'],
          pairedItem: { item: i },
        });

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (this.continueOnFail()) {
          returnData.push({
            json: { error: errorMessage },
            pairedItem: { item: i },
          });
          continue;
        }
        throw new NodeOperationError(this.getNode(), errorMessage, { itemIndex: i });
      }
    }

    return [returnData];
  }
}
