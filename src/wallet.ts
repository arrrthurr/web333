import { createThirdwebClient } from "thirdweb";
import { getWalletBalance, privateKeyToAccount } from "thirdweb/wallets";
import { mnemonicToAccount } from "viem/accounts";
import { defineChain } from "thirdweb/chains";
import { sendTransaction, prepareTransaction, toWei } from "thirdweb";

export interface NetworkOption {
  id: string;
  name: string;
  chain: ReturnType<typeof defineChain>;
  symbol: string;
}

export const NETWORKS: NetworkOption[] = [
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    chain: defineChain({
      id: 1,
      name: "Ethereum",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpc: "https://ethereum-rpc.publicnode.com",
    }),
  },
  {
    id: "base",
    name: "Base",
    symbol: "ETH",
    chain: defineChain({
      id: 8453,
      name: "Base",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpc: "https://base-rpc.publicnode.com",
    }),
  },
  {
    id: "polygon",
    name: "Polygon",
    symbol: "POL",
    chain: defineChain({
      id: 137,
      name: "Polygon PoS",
      nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
      rpc: "https://polygon-bor-rpc.publicnode.com",
    }),
  },
  {
    id: "optimism",
    name: "Optimism",
    symbol: "ETH",
    chain: defineChain({
      id: 10,
      name: "Optimism",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpc: "https://optimism-rpc.publicnode.com",
    }),
  },
  {
    id: "arbitrum",
    name: "Arbitrum One",
    symbol: "ETH",
    chain: defineChain({
      id: 42161,
      name: "Arbitrum One",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpc: "https://arbitrum-one-rpc.publicnode.com",
    }),
  },
];

export function getClient(clientId: string) {
  return createThirdwebClient({ clientId });
}

export function getAccount(client: ReturnType<typeof createThirdwebClient>, mnemonic: string, index: number) {
  const hd = mnemonicToAccount(mnemonic, { addressIndex: index });
  const hdKey = hd.getHdKey();
  const privateKey =
    typeof hdKey.privateKey === "string"
      ? hdKey.privateKey
      : `0x${Buffer.from(hdKey.privateKey!).toString("hex")}`;
  return privateKeyToAccount({ client, privateKey: privateKey as `0x${string}` });
}

export function getAccountAddress(mnemonic: string, index: number): string {
  return mnemonicToAccount(mnemonic, { addressIndex: index }).address;
}

export async function getBalance(
  client: ReturnType<typeof createThirdwebClient>,
  address: string,
  net: NetworkOption,
) {
  try {
    const bal = await getWalletBalance({
      client,
      address: address as `0x${string}`,
      chain: net.chain,
    });
    return { symbol: bal.symbol, value: bal.displayValue, error: null as string | null };
  } catch (e) {
    return {
      symbol: net.symbol,
      value: "0",
      error: e instanceof Error ? e.message : "Failed to fetch",
    };
  }
}

export async function sendNative(
  client: ReturnType<typeof createThirdwebClient>,
  mnemonic: string,
  index: number,
  net: NetworkOption,
  to: string,
  amount: string,
): Promise<string> {
  const account = getAccount(client, mnemonic, index);
  const transaction = prepareTransaction({
    client,
    chain: net.chain,
    to: to as `0x${string}`,
    value: toWei(amount),
  });
  const result = await sendTransaction({ transaction, account });
  return result.transactionHash;
}

export function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
