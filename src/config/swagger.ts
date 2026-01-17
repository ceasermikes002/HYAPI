import swaggerJsdoc from 'swagger-jsdoc';

/**
 * Swagger/OpenAPI Configuration
 * 
 * Defines the metadata and path discovery strategy for API documentation.
 * Adheres to OpenAPI 3.0.0 specification.
 */
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hyperliquid Trade Ledger API',
      version: '1.0.0',
      description: 'A high-performance, dockerized service providing trade history, position reconstruction, and PnL analytics for Hyperliquid users. Designed for hackathons and builder competitions.',
      contact: {
        name: 'API Support',
        url: 'https://hyperliquid.xyz',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/v1',
        description: 'Local Development Server',
      },
    ],
    components: {
      schemas: {
        Trade: {
          type: 'object',
          properties: {
            timeMs: { type: 'number', description: 'Timestamp of the trade in milliseconds' },
            coin: { type: 'string', description: 'Trading pair symbol (e.g., BTC-PERP)' },
            side: { type: 'string', enum: ['B', 'A'], description: 'Side of the trade: B (Buy) or A (Ask/Sell)' },
            px: { type: 'number', description: 'Execution price' },
            sz: { type: 'number', description: 'Size of the trade' },
            fee: { type: 'number', description: 'Fee paid in USDC' },
            closedPnl: { type: 'number', description: 'Realized PnL from this trade' },
            builder: { type: 'string', description: 'Address of the builder/frontend that executed the trade' },
            hash: { type: 'string', description: 'Unique transaction hash' },
          },
        },
        PositionState: {
          type: 'object',
          properties: {
            timeMs: { type: 'number', description: 'Timestamp of the state change' },
            coin: { type: 'string', description: 'Trading pair symbol' },
            netSize: { type: 'number', description: 'Current net position size' },
            avgEntryPx: { type: 'number', description: 'Average entry price of the current position' },
            tainted: { type: 'boolean', description: 'If true, indicates position lifecycle was affected by non-builder trades' },
          },
        },
        PnlMetrics: {
          type: 'object',
          properties: {
            realizedPnl: { type: 'number', description: 'Total realized Profit and Loss in USDC' },
            returnPct: { type: 'number', description: 'Return on Investment percentage based on effective capital' },
            feesPaid: { type: 'number', description: 'Total fees paid in USDC' },
            tradeCount: { type: 'number', description: 'Total number of trades processed' },
            volume: { type: 'number', description: 'Total trading volume in USDC' },
            tainted: { type: 'boolean', description: 'If true, metrics include data from non-target builder sources' },
            effectiveCapital: { type: 'number', description: 'Capital base used for return calculation' },
          },
        },
        LeaderboardEntry: {
          type: 'object',
          properties: {
            rank: { type: 'number', description: 'Rank in the leaderboard' },
            user: { type: 'string', description: 'User wallet address' },
            metricValue: { type: 'number', description: 'Value of the sorting metric (PnL, Return%, Volume)' },
            tradeCount: { type: 'number', description: 'Number of trades' },
            tainted: { type: 'boolean', description: 'Builder-only taint status' },
          },
        },
      },
    },
  },
  apis: ['./src/api/routes/*.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
