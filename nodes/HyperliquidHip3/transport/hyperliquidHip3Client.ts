import { ethers } from 'ethers';
import * as msgpack from '@msgpack/msgpack';
import {
  HyperliquidSignature,
  ExchangeRequest,
  InfoRequest,
  ExchangeAction,
  Meta,
} from '../types';

// Domain configurations for EIP-712 signing
const L1_DOMAIN = {
  name: 'Exchange',
  version: '1',
  chainId: 1337,
  verifyingContract: '0x0000000000000000000000000000000000000000',
};

const AGENT_TYPES = {
  Agent: [
    { name: 'source', type: 'string' },
    { name: 'connectionId', type: 'bytes32' },
  ],
};

export class HyperliquidHip3Client {
  private wallet: ethers.Wallet;
  private isMainnet: boolean;
  private baseUrl: string;
  private userAddress: string;
  private vaultAddress: string | null;
  // The builder-deployed dex identifier, e.g. "xyz"
  readonly dex: string;

  constructor(
    privateKey: string,
    dex: string,
    isMainnet: boolean = true,
    masterAddress?: string,
    vaultAddress?: string,
  ) {
    this.wallet = new ethers.Wallet(privateKey);
    this.dex = dex.toLowerCase().trim();
    this.isMainnet = isMainnet;
    this.baseUrl = isMainnet
      ? 'https://api.hyperliquid.xyz'
      : 'https://api.hyperliquid-testnet.xyz';
    this.userAddress = masterAddress || this.wallet.address;
    this.vaultAddress = vaultAddress || null;
  }

  // ------------------------------------------------------------------ helpers

  private removeTrailingZeros(value: string): string {
    if (value.includes('.')) {
      return value.replace(/\.?0+$/, '');
    }
    return value;
  }

  private normalizeAction(action: unknown): unknown {
    if (typeof action !== 'object' || action === null) return action;
    if (Array.isArray(action)) return action.map((item) => this.normalizeAction(item));

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(action as Record<string, unknown>)) {
      if ((key === 'p' || key === 's' || key === 'triggerPx') && typeof value === 'string') {
        result[key] = this.removeTrailingZeros(value);
      } else if (typeof value === 'object') {
        result[key] = this.normalizeAction(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private async actionHash(action: unknown, nonce: number): Promise<string> {
    const normalizedAction = this.normalizeAction(action);
    const encoded = msgpack.encode(normalizedAction);

    const nonceBytes = new Uint8Array(8);
    const view = new DataView(nonceBytes.buffer);
    view.setBigUint64(0, BigInt(nonce), false);

    let vaultBytes: Uint8Array;
    if (this.vaultAddress) {
      const addrBytes = ethers.getBytes(this.vaultAddress);
      vaultBytes = new Uint8Array([0x01, ...addrBytes]);
    } else {
      vaultBytes = new Uint8Array([0x00]);
    }

    const combined = new Uint8Array([
      ...new Uint8Array(encoded),
      ...nonceBytes,
      ...vaultBytes,
    ]);

    return ethers.keccak256(combined);
  }

  // ----------------------------------------------------------------- signing

  async signL1Action(action: ExchangeAction): Promise<ExchangeRequest> {
    const nonce = Date.now();
    const hash = await this.actionHash(action, nonce);

    const phantomAgent = {
      source: this.isMainnet ? 'a' : 'b',
      connectionId: hash,
    };

    const signature = await this.wallet.signTypedData(L1_DOMAIN, AGENT_TYPES, phantomAgent);
    const sig = ethers.Signature.from(signature);

    const request: ExchangeRequest = {
      action,
      nonce,
      signature: {
        r: sig.r,
        s: sig.s,
        v: sig.v,
      } as HyperliquidSignature,
    };

    if (this.vaultAddress) {
      request.vaultAddress = this.vaultAddress;
    }

    return request;
  }

  // ------------------------------------------------------------------ HTTP

  async exchange(action: ExchangeAction): Promise<unknown> {
    const signedRequest = await this.signL1Action(action);

    const response = await fetch(`${this.baseUrl}/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Exchange request failed: ${error}`);
    }

    return response.json();
  }

  async info(request: InfoRequest): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Info request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // -------------------------------------------------------- HIP-3 info methods
  // All methods that are dex-scoped inject `dex` into the request payload.

  /**
   * Get asset metadata for this builder-deployed DEX.
   * Sends: { "type": "meta", "dex": "<dex>" }
   */
  async getMeta(): Promise<Meta> {
    return this.info({ type: 'meta', dex: this.dex }) as Promise<Meta>;
  }

  /**
   * Get mid prices for all assets in this DEX.
   * Sends: { "type": "allMids", "dex": "<dex>" }
   */
  async getAllMids(): Promise<Record<string, string>> {
    return this.info({ type: 'allMids', dex: this.dex }) as Promise<Record<string, string>>;
  }

  /**
   * Get clearinghouse state (positions, balances) for this DEX.
   * Sends: { "type": "clearinghouseState", "user": "...", "dex": "<dex>" }
   */
  async getClearinghouseState(): Promise<unknown> {
    return this.info({ type: 'clearinghouseState', user: this.userAddress, dex: this.dex });
  }

  /**
   * Get open orders scoped to this DEX.
   * Sends: { "type": "openOrders", "user": "...", "dex": "<dex>" }
   */
  async getOpenOrders(): Promise<unknown[]> {
    return this.info({ type: 'openOrders', user: this.userAddress, dex: this.dex }) as Promise<unknown[]>;
  }

  /**
   * Get user fills. Fills are global (not dex-scoped) but we optionally
   * accept a startTime for pagination.
   */
  async getUserFills(startTime?: number): Promise<unknown[]> {
    const request: InfoRequest = { type: 'userFills', user: this.userAddress };
    if (startTime) request.startTime = startTime;
    return this.info(request) as Promise<unknown[]>;
  }

  /**
   * Get order status by OID (global, not dex-scoped).
   */
  async getOrderStatus(oid: number): Promise<unknown> {
    return this.info({ type: 'orderStatus', user: this.userAddress, oid });
  }

  /**
   * Get historical orders (global, not dex-scoped).
   */
  async getHistoricalOrders(): Promise<unknown[]> {
    return this.info({ type: 'historicalOrders', user: this.userAddress }) as Promise<unknown[]>;
  }

  /**
   * Get user funding history.
   */
  async getUserFunding(startTime: number, endTime?: number): Promise<unknown[]> {
    const request: InfoRequest = { type: 'userFunding', user: this.userAddress, startTime };
    if (endTime) request.endTime = endTime;
    return this.info(request) as Promise<unknown[]>;
  }

  /**
   * Get user fees.
   */
  async getUserFees(): Promise<unknown> {
    return this.info({ type: 'userFees', user: this.userAddress });
  }

  /**
   * Get candle (OHLCV) data for a coin.
   * coin must already be in "dex:SYMBOL" format.
   */
  async getCandleSnapshot(
    coin: string,
    interval: string,
    startTime: number,
    endTime: number,
  ): Promise<unknown[]> {
    return this.info({
      type: 'candleSnapshot',
      req: { coin, interval, startTime, endTime },
    }) as Promise<unknown[]>;
  }

  /**
   * Get funding rate history for a coin.
   */
  async getFundingHistory(coin: string, startTime: number, endTime?: number): Promise<unknown[]> {
    const request: InfoRequest = { type: 'fundingHistory', coin, startTime };
    if (endTime) request.endTime = endTime;
    return this.info(request) as Promise<unknown[]>;
  }

  /**
   * Get predicted fundings.
   */
  async getPredictedFundings(): Promise<unknown[]> {
    return this.info({ type: 'predictedFundings' }) as Promise<unknown[]>;
  }

  /**
   * Get recent trades for a coin.
   */
  async getRecentTrades(coin: string): Promise<unknown[]> {
    return this.info({ type: 'recentTrades', coin }) as Promise<unknown[]>;
  }

  /**
   * Get meta and asset contexts with mark price, OI, funding.
   * Scoped to this DEX.
   */
  async getMetaAndAssetCtxs(): Promise<unknown> {
    return this.info({ type: 'metaAndAssetCtxs', dex: this.dex });
  }

  /**
   * List all available builder-deployed perp DEXes.
   */
  async getPerpDexs(): Promise<unknown[]> {
    return this.info({ type: 'perpDexs' }) as Promise<unknown[]>;
  }

  /**
   * Get perp DEX limits (max positions, leverage caps, etc.) for this DEX.
   */
  async getPerpDexLimits(): Promise<unknown> {
    return this.info({ type: 'perpDexLimits', dex: this.dex });
  }

  // ----------------------------------------------------------------- helpers

  get address(): string {
    return this.userAddress;
  }

  get signerAddress(): string {
    return this.wallet.address;
  }

  /**
   * Format a raw symbol like "XYZ100" into "xyz:XYZ100" using this client's dex.
   * Already-prefixed strings ("xyz:XYZ100") are returned unchanged.
   */
  formatCoin(symbol: string): string {
    // Already prefixed — don't double-prefix
    if (symbol.includes(':')) return symbol;
    return `${this.dex}:${symbol.toUpperCase()}`;
  }
}
