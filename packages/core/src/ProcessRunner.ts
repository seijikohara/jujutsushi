export interface ProcessResult {
  readonly stdout: string;
  readonly stderr: string;
}

/** Thrown when a `ProcessRunner` couldn't start the process at all. */
export class ProcessLaunchError extends Error {
  constructor(
    public readonly reason: 'not-found' | 'other',
    message: string,
  ) {
    super(message);
    this.name = 'ProcessLaunchError';
  }
}

/** Thrown when a process ran but exited with a non-zero code. */
export class ProcessExitError extends Error {
  constructor(
    public readonly exitCode: number,
    public readonly stdout: string,
    public readonly stderr: string,
  ) {
    super(`Process exited with code ${exitCode}: ${stderr}`);
    this.name = 'ProcessExitError';
  }
}

/**
 * Runs a command and returns its output. Implementations differ by
 * environment: `testing/NodeProcessRunner.ts` (Jest/Node, via
 * node:child_process) vs. apps/macos's NativeProcessRunner (the real app,
 * via a Swift bridge module — React Native's JS runtime has no subprocess
 * API of its own).
 */
export interface ProcessRunner {
  run(command: string, args: readonly string[], cwd?: string): Promise<ProcessResult>;
}
