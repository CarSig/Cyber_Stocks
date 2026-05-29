import { DataSyncService } from './data-sync.service';
import * as clients from '@/shared/clients/YahooCompanyClient';
import companies from '@/data/companies';

jest.mock('@/shared/clients/YahooCompanyClient');

describe('DataSyncService cache invalidation', () => {
  const names = Object.keys(companies);

  beforeEach(() => jest.clearAllMocks());

  it('invalidates ticker/sparkline/history cache keys after populating each company', async () => {
    (clients.CybersecurityClient as unknown as jest.Mock).mockImplementation(() => ({
      populate: jest.fn().mockResolvedValue(undefined),
      populateNews: jest.fn().mockResolvedValue(0),
    }));

    const del = jest.fn().mockResolvedValue(undefined);
    const service = new DataSyncService({} as any, { del } as any);

    await service.populateAll();

    // 3 keys per company
    expect(del).toHaveBeenCalledTimes(names.length * 3);
    const sample = names[0];
    expect(del).toHaveBeenCalledWith(`ticker:${sample}`);
    expect(del).toHaveBeenCalledWith(`sparkline:${sample}`);
    expect(del).toHaveBeenCalledWith(`history:${sample}`);
  });

  it('does not invalidate cache for a company whose populate fails', async () => {
    const failName = names[0];
    (clients.CybersecurityClient as unknown as jest.Mock).mockImplementation((name: string) => ({
      populate: jest
        .fn()
        .mockImplementation(() => (name === failName ? Promise.reject(new Error('boom')) : Promise.resolve(undefined))),
    }));

    const del = jest.fn().mockResolvedValue(undefined);
    const service = new DataSyncService({} as any, { del } as any);

    await service.populateAll();

    expect(del).not.toHaveBeenCalledWith(`ticker:${failName}`);
    // remaining companies still invalidated
    expect(del).toHaveBeenCalledTimes((names.length - 1) * 3);
  });
});
