import { describe, expect, it } from '@jest/globals';
import { RequestContext } from './request-context.js';

describe('RequestContext', () => {
  it('stores and reads correlationId inside run()', () => {
    RequestContext.run({ correlationId: 'cid-1', startedAt: 1 }, () => {
      expect(RequestContext.correlationId()).toBe('cid-1');
      expect(RequestContext.get()?.startedAt).toBe(1);
    });
  });

  it('returns undefined outside run()', () => {
    expect(RequestContext.correlationId()).toBeUndefined();
  });
});
