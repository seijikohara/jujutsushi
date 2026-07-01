import { NativeModules } from 'react-native';
import type { ProcessRunner, ProcessResult } from '@jujutsushi/core';
import { ProcessExitError, ProcessLaunchError } from '@jujutsushi/core';

interface JjProcessExecutorModule {
  execute(
    command: string,
    args: string[],
    cwd: string | null,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

interface NativeExecuteError extends Error {
  code?: string;
}

const { JjProcessExecutor } = NativeModules as {
  JjProcessExecutor: JjProcessExecutorModule;
};

/**
 * ProcessRunner backed by the native JjProcessExecutor bridge (Task 11).
 * This is the counterpart to packages/core's Jest-only NodeProcessRunner --
 * same interface, different implementation, because React Native's JS
 * runtime has no node:child_process of its own.
 */
export class NativeProcessRunner implements ProcessRunner {
  async run(command: string, args: readonly string[], cwd?: string): Promise<ProcessResult> {
    let result: { stdout: string; stderr: string; exitCode: number };
    try {
      result = await JjProcessExecutor.execute(command, [...args], cwd ?? null);
    } catch (error) {
      const nativeError = error as NativeExecuteError;
      if (nativeError.code === 'E_COMMAND_NOT_FOUND') {
        throw new ProcessLaunchError('not-found', nativeError.message);
      }
      throw new ProcessLaunchError('other', nativeError.message ?? String(error));
    }

    if (result.exitCode !== 0) {
      throw new ProcessExitError(result.exitCode, result.stdout, result.stderr);
    }
    return { stdout: result.stdout, stderr: result.stderr };
  }
}
