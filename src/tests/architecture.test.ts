import { describe, expect, test } from '@jest/globals';
import { TradeService } from '../services/tradeService.js';
import { MockDataSource } from '../datasources/mock/index.js';

describe('Architecture Verification', () => {
  test('Service should work with any implementation of IDataSource (Dependency Injection)', async () => {
    // 1. Setup Mock Datasource
    const mockSource = new MockDataSource();
    
    // 2. Inject into Service (Proof of Abstraction)
    const tradeService = new TradeService(mockSource);
    
    // 3. Test Functionality
    const trades = await tradeService.getTrades({ user: '0xUser', builderOnly: false });
    
    expect(trades).toHaveLength(2);
    expect(trades[0].coin).toBe('BTC');
  });

  test('Builder Filter should work on Abstracted Data', async () => {
    const mockSource = new MockDataSource();
    const tradeService = new TradeService(mockSource);
    
    // Set env var for test
    process.env.TARGET_BUILDER = '0xMockBuilder';
    
    const trades = await tradeService.getTrades({ user: '0xUser', builderOnly: true });
    
    expect(trades).toHaveLength(1);
    expect(trades[0].builder).toBe('0xMockBuilder');
  });
});
