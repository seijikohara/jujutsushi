import { SubprocessJjClient } from './JjClient';
import { NodeProcessRunner } from './testing/NodeProcessRunner';

describe('SubprocessJjClient', () => {
  let client: SubprocessJjClient;

  beforeEach(() => {
    client = new SubprocessJjClient(new NodeProcessRunner());
  });

  describe('getVersion', () => {
    it('returns the installed jj version', async () => {
      const version = await client.getVersion();
      expect(version.major).toBeGreaterThanOrEqual(0);
      expect(version.raw).toMatch(/^jj \d+\.\d+\.\d+/);
    });
  });
});
