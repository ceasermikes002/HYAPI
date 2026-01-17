
import { Hyperliquid } from 'hyperliquid';

async function checkMethods() {
  const sdk = new Hyperliquid({ enableWs: false });
  console.log('info prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(sdk.info)));
}

checkMethods();
