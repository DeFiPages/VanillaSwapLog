import Web3 from "web3";
import BigNumber from "bignumber.js";
import { NumberTypes, ByteTypes, BlockNumberOrTag } from 'web3-types';

export const logItemSchema = {
  model: {
    fields: {
      Block: { type: "number" },
      Amount0: { type: "number" },
      Amount1: { type: "number" },
      Ratio_0_1: { type: "number" },
      Ratio_1_0: { type: "number" },
      tx_id: { type: "string" },
    },
  }
}

interface logItem {
  Block: number,
  Amount0: number,
  Amount1: number,
  Ratio_0_1: number,
  Ratio_1_0: number,
  tx_id: string,
}

export function logColumns(columnWidths: number[] = []): kendo.ui.GridColumn[] {
  return [
    { field: 'Block', title: 'Block', width: columnWidths[0] ||80, template: '<a href="https://mainnet-dmc.mydefichain.com:8441/block/${Block}" target="_blank">${Block}</a>' },
    { field: 'Amount0', title: 'Amount 0', width: columnWidths[1] || 100 },
    { field: 'Amount1', title: 'Amount 1', width: columnWidths[2] || 100 },
    { field: 'Ratio_0_1', title: 'Ratio 0/1', width: columnWidths[3] || 100, },
    { field: 'Ratio_1_0', title: 'Ratio 1/0', width: columnWidths[4] || 100, },
    { field: 'tx_id', title: "tx", template: '<a href="https://mainnet-dmc.mydefichain.com:8441/tx/${tx_id}" target="_blank">${tx_id}</a>' },
  ]
}

export function logTooltip(e: any): string {
  var text = e.target.text().trim(); 
  switch (text) {
    case "Block": return "Blocknumber";
    default:
      return text;
  }
}

type ReturnFormat = {
  number: keyof NumberTypes; 
  bytes: keyof ByteTypes; 
};

interface Log {
  readonly id?: string;
  readonly removed?: boolean;
  readonly logIndex?: NumberTypes[ReturnFormat["number"]];
  readonly transactionIndex?: NumberTypes[ReturnFormat["number"]];
  readonly transactionHash?: ByteTypes[ReturnFormat["bytes"]];
  readonly blockHash?: ByteTypes[ReturnFormat["bytes"]];
  readonly blockNumber?: NumberTypes[ReturnFormat["number"]];
  readonly address?: string;
  readonly data?: ByteTypes[ReturnFormat["bytes"]];
  readonly topics?: ByteTypes[ReturnFormat["bytes"]][];
}

export async function fetchLogs(contractAddress: string): Promise<logItem[]> {
  const logItems: logItem[] = [];
  try {
    const providerUrl = "https://dmc.mydefichain.com/mainnet";
    const web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));

    const isConnected: boolean = await web3.eth.net.isListening();
    if (!isConnected) {
      console.error("Failed to connect to DMC RPC");
      alert("Failed to connect to DMC RPC");
      return [];
    }
    console.log("Connected to DMC RPC");

    const fromBlock: number = 0;
   
    const filterParams = {
      address: contractAddress,
      fromBlock: fromBlock,
      toBlock: 'latest' as BlockNumberOrTag,
      topics: [
        "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",
        "0x000000000000000000000000e99ca567fb57936ef91c472cbe80f35867fd7323",
        "0x000000000000000000000000e99ca567fb57936ef91c472cbe80f35867fd7323",
      ]
    };

    const logs: (string | Log)[] = await web3.eth.getPastLogs(filterParams);
    console.log(`Found ${logs.length} logs.`);

    logs.forEach(log => {
      if (typeof log !== 'string' && log.data && typeof log.data === 'string') {
        const data = log.data;
        const amount0In = new BigNumber(data.substring(2, 66), 16);
        const amount1In = new BigNumber(data.substring(66, 130), 16);
        const amount0Out = new BigNumber(data.substring(130, 194), 16);
        const amount1Out = new BigNumber(data.substring(194, 258), 16);

        const amount0: string = web3.utils.fromWei(amount0In.minus(amount0Out).toString(10), 'ether');
        const amount1: string = web3.utils.fromWei(amount1In.minus(amount1Out).toString(10), 'ether');

        const ratio0: number = Math.abs(parseFloat(amount0) / parseFloat(amount1));
        const ratio1: number = Math.abs(parseFloat(amount1) / parseFloat(amount0));

        const item: logItem = {
          Block: log.blockNumber !== undefined ? Number(log.blockNumber) : -1,
          Amount0: parseFloat(amount0),
          Amount1: parseFloat(amount1),
          Ratio_0_1: ratio0,
          Ratio_1_0: ratio1,
          tx_id: typeof log.transactionHash === 'string' ? log.transactionHash :
             (log.transactionHash instanceof Uint8Array ? Buffer.from(log.transactionHash).toString('hex') : 
             "Unknown")
      };

      logItems.push(item);
      }
    });
    return logItems;
  } catch (error) {
    console.error("Error fetching data:", error);
    alert(`Error fetching data: ${error}`);
    return [];
  }
}