import { StockService } from './stock.service';

describe('StockService.invalidateTicker', () => {
  it('deletes the ticker, sparkline, and history cache keys for the company name', async () => {
    const del = jest.fn().mockResolvedValue(undefined);
    const mockDb = {} as any;
    const mockCache = { del } as any;

    const service = new StockService(mockDb, mockCache);
    await service.invalidateTicker('CrowdStrike Holdings');

    expect(del).toHaveBeenCalledWith('ticker:CrowdStrike Holdings');
    expect(del).toHaveBeenCalledWith('sparkline:CrowdStrike Holdings');
    expect(del).toHaveBeenCalledWith('history:CrowdStrike Holdings');
    expect(del).toHaveBeenCalledTimes(3);
  });
});
