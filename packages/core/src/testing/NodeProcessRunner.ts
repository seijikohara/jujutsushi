import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import type { ProcessRunner, ProcessResult } from '../ProcessRunner';
import { ProcessLaunchError, ProcessExitError } from '../ProcessRunner';

const execFile = promisify(execFileCallback);

interface ExecFileError extends Error {
  code?: string | number;
  stdout?: string;
  stderr?: string;
}

function isExecFileError(error: unknown): error is ExecFileError {
  return error instanceof Error;
}

/**
 * node:child_process-backed ProcessRunner. Only used by this package's own
 * Jest tests (which run under Node) — the real app uses a native bridge
 * instead, since React Native's JS runtime has no node:child_process.
 * Deliberately not exported from index.ts so it can never end up in
 * Metro's bundle.
 */
export class NodeProcessRunner implements ProcessRunner {
  async run(command: string, args: readonly string[], cwd?: string): Promise<ProcessResult> {
    try {
      return await execFile(command, args as string[], { cwd });
    } catch (error) {
      if (isExecFileError(error) && error.code === 'ENOENT') {
        throw new ProcessLaunchError('not-found', `${command} not found on PATH`);
      }
      if (isExecFileError(error)) {
        const exitCode = typeof error.code === 'number' ? error.code : 1;
        throw new ProcessExitError(exitCode, error.stdout ?? '', error.stderr ?? '');
      }
      throw error;
    }
  }
}
