import { config as dotEnvConfig } from "dotenv";

import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers"

dotEnvConfig({ path: `./.env` });

if (
  !process.env.PRIVATE_KEY ||
  !process.env.JSON_MAINNET_RPC ||
  !process.env.TESTNET_RPC
) {
  throw new Error(
    `Please provide your PRIVATE_KEY or MAINNET_RPC or TESTNET_RPC in .env in the project root`
  );
}

module.exports = {
  networks: {
    hardhat: {},
    mainnet: {
      url: process.env.JSON_MAINNET_RPC,
      chainId: 56,
      accounts: [
        process.env.PRIVATE_KEY.startsWith("0x")
          ? process.env.PRIVATE_KEY
          : process.env.PRIVATE_KEY,
      ],
    },
    testnet: {
      url: process.env.TESTNET_RPC,
      chainId: 97,
      accounts: [
        process.env.PRIVATE_KEY!.startsWith("0x")
          ? process.env.PRIVATE_KEY
          : `0x${process.env.PRIVATE_KEY}`,
      ],
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.9",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      }
    ],
  },
};
