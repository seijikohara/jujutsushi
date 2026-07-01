import type { ProcessRunner, ProcessResult } from './ProcessRunner';
import { ProcessLaunchError, ProcessExitError } from './ProcessRunner';
import type { JjVersion } from './version';
import { parseJjVersion } from './version';
import { JjBinaryNotFoundError, JjNotARepositoryError } from './errors';

export interface JjWorkingCopyStatus {
  readonly commitId: string;
  readonly changeId: string;
  readonly description: string;
  readonly parents: readonly string[];
}

export interface JjClient {
  getVersion(): Promise<JjVersion>;
  getStatus(repoPath: string): Promise<JjWorkingCopyStatus>;
}

interface RawWorkingCopyCommit {
  commit_id: string;
  change_id: string;
  description: string;
  parents: string[];
}

export class SubprocessJjClient implements JjClient {
  constructor(private readonly processRunner: ProcessRunner) {}

  async getVersion(): Promise<JjVersion> {
    const { stdout } = await this.run(['--version']);
    return parseJjVersion(stdout);
  }

  async getStatus(repoPath: string): Promise<JjWorkingCopyStatus> {
    const { stdout } = await this.run(
      ['log', '-T', 'json(self)', '--no-graph', '-r', '@'],
      repoPath,
    );
    const raw = JSON.parse(stdout.trim()) as RawWorkingCopyCommit;
    return {
      commitId: raw.commit_id,
      changeId: raw.change_id,
      description: raw.description,
      parents: raw.parents,
    };
  }

  private async run(args: string[], cwd?: string): Promise<ProcessResult> {
    try {
      return await this.processRunner.run('jj', args, cwd);
    } catch (error) {
      if (error instanceof ProcessLaunchError && error.reason === 'not-found') {
        throw new JjBinaryNotFoundError();
      }
      if (
        error instanceof ProcessExitError &&
        cwd &&
        error.stderr.includes('There is no jj repo in')
      ) {
        throw new JjNotARepositoryError(cwd);
      }
      // Handle errors with stderr property (duck typing for ProcessExitError)
      const stderr = (error as any).stderr;
      if (
        stderr &&
        cwd &&
        typeof stderr === 'string' &&
        stderr.includes('There is no jj repo in')
      ) {
        throw new JjNotARepositoryError(cwd);
      }
      throw error;
    }
  }
}
