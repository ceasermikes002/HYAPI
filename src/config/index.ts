import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  targetBuilder: process.env.TARGET_BUILDER || '', // 0x...
  hyperliquid: {
    enableWs: process.env.ENABLE_WS === 'true',
    testnet: process.env.TESTNET === 'true',
  },
};
