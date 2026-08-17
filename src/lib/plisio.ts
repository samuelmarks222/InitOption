const normalizeCode = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const includesAny = (network: string, tokens: string[]) => {
  const normalizedNetwork = normalizeCode(network);
  return tokens.some((token) => normalizedNetwork.includes(token));
};

export const buildPlisioInstructionAddress = (orderNumber: string) => `plisio:${orderNumber}`;
export const isPlisioInstructionAddress = (value: string | null | undefined) =>
  typeof value === "string" && value.startsWith("plisio:");

export const mapCryptoMethodToPlisioCurrency = ({
  network,
  symbol,
}: {
  network: string;
  symbol: string;
}) => {
  const normalizedSymbol = normalizeCode(symbol);

  if (normalizedSymbol === "usdt") {
    if (includesAny(network, ["trc20", "tron", "trx"])) return "USDT_TRX";
    if (includesAny(network, ["bep20", "bsc", "binancesmartchain", "bnb"])) return "USDT_BSC";
    if (includesAny(network, ["ton"])) return "USDT_TON";
    if (includesAny(network, ["sol", "solana"])) return "USDT_SOL";
    if (includesAny(network, ["erc20", "ethereum", "eth"])) return "USDT";
    return null;
  }

  if (normalizedSymbol === "usdc") {
    if (includesAny(network, ["base"])) return "USDC_BASE";
    if (includesAny(network, ["sol", "solana"])) return "USDC_SOL";
    if (includesAny(network, ["bep20", "bsc", "binancesmartchain", "bnb"])) return "USDC_BSC";
    if (includesAny(network, ["erc20", "ethereum", "eth"])) return "USDC";
    return null;
  }

  if (normalizedSymbol === "eth") {
    if (includesAny(network, ["base"])) return "ETH_BASE";
    return "ETH";
  }

  if (normalizedSymbol === "btt" && includesAny(network, ["trc20", "tron", "trx"])) {
    return "BTT_TRX";
  }

  if (normalizedSymbol === "btc") return "BTC";
  if (normalizedSymbol === "ltc") return "LTC";
  if (normalizedSymbol === "dash") return "DASH";
  if (normalizedSymbol === "zec") return "TZEC";
  if (normalizedSymbol === "doge") return "DOGE";
  if (normalizedSymbol === "bch") return "BCH";
  if (normalizedSymbol === "xmr") return "XMR";
  if (normalizedSymbol === "shib") return "SHIB";
  if (normalizedSymbol === "ape") return "APE";
  if (normalizedSymbol === "trx") return "TRX";
  if (normalizedSymbol === "bnb") return "BNB";
  if (normalizedSymbol === "etc") return "ETC";
  if (normalizedSymbol === "ton") return "TON";
  if (normalizedSymbol === "sol") return "SOL";

  return null;
};

export const isPlisioSupportedCryptoMethod = ({
  network,
  symbol,
}: {
  network: string;
  symbol: string;
}) => Boolean(mapCryptoMethodToPlisioCurrency({ network, symbol }));
