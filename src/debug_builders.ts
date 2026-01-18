
console.log("Script starting...");
import dotenv from 'dotenv';
dotenv.config();
console.log("Dotenv loaded");

import { HyperliquidDataSource } from './datasources/hyperliquid/index.js';

const user = '0x0e09b56ef137f417e424f1265425e93bfff77e17';

async function main() {
  console.log(`Fetching trades for user: ${user}`);
  try {
    const ds = new HyperliquidDataSource();
    console.log("DataSource initialized");
    
    const trades = await ds.getUserFills(user);
    console.log(`Total trades found: ${trades.length}`);
    
    if (trades.length === 0) {
      console.log('No trades found for this user.');
      return;
    }

    const builders = new Set(trades.map(t => t.builder));
    console.log('\n--- Builder Addresses Found in Trades ---');
    builders.forEach(b => {
      console.log(`- "${b}"`);
    });
    console.log('-----------------------------------------');
    
    const targetBuilder = process.env.TARGET_BUILDER;
    console.log(`\nCurrent TARGET_BUILDER in env: "${targetBuilder}"`);
    
    const matches = trades.filter(t => t.builder === targetBuilder);
    console.log(`Trades matching TARGET_BUILDER: ${matches.length}`);
    
  } catch (error) {
    console.error('Error fetching trades:', error);
  }
}

main().catch(err => console.error("Main error:", err));
