// Order types matching Hyperliquid API
export interface HyperliquidOrderWire {
  a: number;           // Asset index
  b: boolean;          // Buy side (true) or sell (false)
  p: string;           // Price (no trailing zeros)
  s: string;           // Size (no trailing zeros)
  r: boolean;          // Reduce only
  t: OrderTypeWire;    // Order type
  c?: string;          // Client order ID (optional)
}

export type OrderTypeWire =
  | { limit: { tif: 'Gtc' | 'Alo' | 'Ioc' } }
  | { trigger: { isMarket: boolean; triggerPx: string; tpsl: 'tp' | 'sl' } };

export interface PlaceOrderAction {
  type: 'order';
  orders: HyperliquidOrderWire[];
  grouping: 'na' | 'normalTpsl' | 'positionTpsl';
  builder?: { b: string; f: number };
}

export interface CancelOrderAction {
  type: 'cancel';
  cancels: Array<{ a: number; o: number }>;
}

export interface CancelByCloidAction {
  type: 'cancelByCloid';
  cancels: Array<{ asset: number; cloid: string }>;
}

export interface ModifyOrderAction {
  type: 'modify';
  oid: number;
  order: HyperliquidOrderWire;
}

export interface BatchModifyAction {
  type: 'batchModify';
  modifies: Array<{ oid: number; order: HyperliquidOrderWire }>;
}

export interface ScheduleCancelAction {
  type: 'scheduleCancel';
  time: number | null;
}

export interface UpdateIsolatedMarginAction {
  type: 'updateIsolatedMargin';
  asset: number;
  isBuy: boolean;
  ntli: number;
}

export interface UpdateLeverageAction {
  type: 'updateLeverage';
  asset: number;
  isCross: boolean;
  leverage: number;
}

export interface HyperliquidSignature {
  r: string;
  s: string;
  v: number;
}

export interface ExchangeRequest {
  action: ExchangeAction;
  nonce: number;
  signature: HyperliquidSignature;
  vaultAddress?: string;
}

// ================================================================ INFO TYPES

export interface ClearinghouseState {
  marginSummary: {
    accountValue: string;
    totalNtlPos: string;
    totalRawUsd: string;
    totalMarginUsed: string;
  };
  crossMarginSummary: {
    accountValue: string;
    totalNtlPos: string;
  };
  assetPositions: AssetPosition[];
  withdrawable?: string;
}

export interface AssetPosition {
  position: {
    coin: string;
    szi: string;
    leverage: { type: string; value: number };
    entryPx: string;
    positionValue: string;
    unrealizedPnl: string;
    returnOnEquity: string;
    liquidationPx: string | null;
  };
}

export interface OpenOrder {
  coin: string;
  limitPx: string;
  oid: number;
  side: 'B' | 'A';
  sz: string;
  timestamp: number;
  orderType: string;
}

export type AllMids = Record<string, string>;

// HIP-3: universe entries may include onlyIsolated and marginTableId
export interface Meta {
  universe: Array<{
    name: string;           // e.g. "xyz:XYZ100"
    szDecimals: number;
    maxLeverage: number;
    onlyIsolated?: boolean; // HIP-3: true means isolated margin only
    marginTableId?: number; // HIP-3: custom margin table
  }>;
}

export interface InfoRequest {
  type: string;
  user?: string;
  coin?: string;
  startTime?: number;
  endTime?: number;
  oid?: number;
  interval?: string;
  dex?: string;           // HIP-3: builder-deployed DEX identifier
  [key: string]: unknown;
}

// Candle data
export interface Candle {
  t: number;   // Timestamp (open time)
  T: number;   // Close time
  s: string;   // Symbol
  i: string;   // Interval
  o: string;   // Open price
  c: string;   // Close price
  h: string;   // High price
  l: string;   // Low price
  v: string;   // Volume
  n: number;   // Number of trades
}

// Funding data
export interface FundingHistory {
  coin: string;
  fundingRate: string;
  premium: string;
  time: number;
}

// Predicted funding
export interface PredictedFunding {
  coin: string;
  fundingRate: string;
  premium: string;
  nextFundingTime: number;
}

// Recent trade
export interface RecentTrade {
  coin: string;
  side: string;
  px: string;
  sz: string;
  time: number;
  hash: string;
}

// Asset context (mark price, OI, funding)
export interface AssetCtx {
  funding: string;
  openInterest: string;
  prevDayPx: string;
  dayNtlVlm: string;
  premium: string;
  oraclePx: string;
  markPx: string;
  midPx: string;
  impactPxs: string[];
}

export interface MetaAndAssetCtxs {
  meta: Meta;
  assetCtxs: AssetCtx[];
}

// Order status response
export interface OrderStatusResponse {
  order: {
    coin: string;
    limitPx: string;
    oid: number;
    side: string;
    sz: string;
    timestamp: number;
    orderType: string;
    origSz: string;
    cloid?: string;
  };
  status: string;
  statusTimestamp: number;
}

// Historical order
export interface HistoricalOrder {
  coin: string;
  limitPx: string;
  oid: number;
  side: string;
  sz: string;
  timestamp: number;
  orderType: string;
  origSz: string;
  cloid?: string;
  status: string;
  statusTimestamp: number;
}

// User funding entry
export interface UserFundingEntry {
  time: number;
  coin: string;
  usdc: string;
  szi: string;
  fundingRate: string;
}

// User fees
export interface UserFees {
  dailyUserVlm: string;
  feeSchedule: {
    taker: string;
    maker: string;
  };
  userCrossRate: string;
  userAddRate: string;
  activeReferralDiscount: string;
}

// Exchange action types union
export type ExchangeAction =
  | PlaceOrderAction
  | CancelOrderAction
  | CancelByCloidAction
  | ModifyOrderAction
  | BatchModifyAction
  | ScheduleCancelAction
  | UpdateLeverageAction
  | UpdateIsolatedMarginAction;
