import type { ProcessRunner, ProcessResult } from './ProcessRunner';
import { ProcessLaunchError } from './ProcessRunner';
import type { JjVersion } from './version';
import { parseJjVersion } from './version';
import { JjBinaryNotFoundError } from './errors';

export interface JjClient {
  getVersion(): Promise<JjVersion>;
}

export class SubprocessJjClient implements JjClient {
  constructor(private readonly processRunner: ProcessRunner) {}

  async getVersion(): Promise<JjVersion> {
    const { stdout } = await this.run(['--version']);
    return parseJjVersion(stdout);
  }

  private async run(args: string[], cwd?: string): Promise<ProcessResult> {
    try {
      return await this.processRunner.run('jj', args, cwd);
    } catch (error) {
      if (error instanceof ProcessLaunchError && error.reason === 'not-found') {
        throw new JjBinaryNotFoundError();
      }
      throw error;
    }
  }
}
