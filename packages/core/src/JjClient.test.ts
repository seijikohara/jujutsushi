import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SubprocessJjClient } from './JjClient';
import { NodeProcessRunner } from './testing/NodeProcessRunner';
import { JjNotARepositoryError } from './errors';

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

  describe('getStatus', () => {
    let repoPath: string;

    beforeEach(async () => {
      repoPath = await mkdtemp(join(tmpdir(), 'jujutsushi-jjclient-test-'));
      const runner = new NodeProcessRunner();
      await runner.run('jj', ['git', 'init', '--quiet'], repoPath);
    });

    afterEach(async () => {
      await rm(repoPath, { recursive: true, force: true });
    });

    it('returns the working-copy commit for a fresh repository', async () => {
      const status = await client.getStatus(repoPath);
      expect(status.description).toBe('');
      expect(status.parents).toEqual(['0000000000000000000000000000000000000000']);
      expect(status.commitId).toMatch(/^[0-9a-f]{40}$/);
      expect(status.changeId).toMatch(/^[a-z]{32}$/);
    });

    it('throws JjNotARepositoryError for a non-repository path', async () => {
      const nonRepoPath = await mkdtemp(join(tmpdir(), 'jujutsushi-not-a-repo-'));
      try {
        await expect(client.getStatus(nonRepoPath)).rejects.toThrow(JjNotARepositoryError);
      } finally {
        await rm(nonRepoPath, { recursive: true, force: true });
      }
    });
  });
});
