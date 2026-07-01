import type { JestConfigWithTsJest } from 'ts-jest';
import { createDefaultPreset } from 'ts-jest';

export default {
  displayName: 'core',
  testEnvironment: 'node',
  ...createDefaultPreset(),
} satisfies JestConfigWithTsJest;
