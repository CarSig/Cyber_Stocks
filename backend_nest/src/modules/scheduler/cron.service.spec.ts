import { CronService } from './cron.service';

describe('CronService', () => {
  it('constructs without accessing coreDb.pool at instantiation time', () => {
    // Regression: coreDb.pool was accessed in the constructor, causing
    // "Cannot read properties of undefined (reading 'pool')" when NestJS
    // DI injects parameters before class fields are initialized (tsx runtime).
    const mockCoreDb = {} as any; // intentionally no .pool
    const mockReddit = {} as any;
    const mockEmitter = {} as any;

    expect(() => new CronService(mockReddit, mockEmitter, mockCoreDb)).not.toThrow();
  });
});
