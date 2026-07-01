export interface JjVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
  readonly raw: string;
}

const VERSION_PATTERN = /(\d+)\.(\d+)\.(\d+)/;

export function parseJjVersion(versionOutput: string): JjVersion {
  const match = VERSION_PATTERN.exec(versionOutput);
  if (!match) {
    throw new Error(`Could not parse jj version from: "${versionOutput}"`);
  }
  const [, major, minor, patch] = match;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    raw: versionOutput.trim(),
  };
}

export function isVersionAtLeast(version: JjVersion, minimum: JjVersion): boolean {
  if (version.major !== minimum.major) {
    return version.major > minimum.major;
  }
  if (version.minor !== minimum.minor) {
    return version.minor > minimum.minor;
  }
  return version.patch >= minimum.patch;
}

export const MINIMUM_SUPPORTED_JJ_VERSION: JjVersion = {
  major: 0,
  minor: 42,
  patch: 0,
  raw: '0.42.0',
};
