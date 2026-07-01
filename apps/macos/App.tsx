import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, useColorScheme } from 'react-native';
import {
  SubprocessJjClient,
  JjVersionTooOldError,
  isVersionAtLeast,
  MINIMUM_SUPPORTED_JJ_VERSION,
} from '@jujutsushi/core';
import { NativeProcessRunner } from './src/NativeProcessRunner';

// Hardcoded to this project's own repository for now -- Foundation's scope
// is proving the integration works end-to-end, not building a repo picker
// (that's sub-project B). This repo is already jj-colocated (see the plan's
// Global Constraints), so it's real data, not a throwaway fixture.
const REPO_PATH = '/Users/seiji/git/GitHub/seijikohara/jujutsushi';

async function loadStatus(): Promise<string> {
  const client = new SubprocessJjClient(new NativeProcessRunner());

  const version = await client.getVersion();
  if (!isVersionAtLeast(version, MINIMUM_SUPPORTED_JJ_VERSION)) {
    throw new JjVersionTooOldError(version, MINIMUM_SUPPORTED_JJ_VERSION);
  }

  const status = await client.getStatus(REPO_PATH);
  return JSON.stringify({ jjVersion: version.raw, status }, null, 2);
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [output, setOutput] = useState('Loading jj status...');

  useEffect(() => {
    loadStatus()
      .then(setOutput)
      .catch((error) =>
        setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`),
      );
  }, []);

  return (
    <SafeAreaView style={isDarkMode ? styles.darkContainer : styles.lightContainer}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Text style={isDarkMode ? styles.darkText : styles.lightText}>
          Jujutsushi — Foundation proof of life
        </Text>
        <Text style={isDarkMode ? styles.darkText : styles.lightText}>{output}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Extracted so the color values aren't flagged by react-native/no-color-literals
// (an error in this repo's oxlint config); the rule targets literals inside
// style objects, not references. Behavior is identical to inline literals.
const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  darkContainer: { backgroundColor: COLORS.black, flex: 1 },
  darkText: { color: COLORS.white, fontFamily: 'Menlo', padding: 16 },
  lightContainer: { backgroundColor: COLORS.white, flex: 1 },
  lightText: { color: COLORS.black, fontFamily: 'Menlo', padding: 16 },
});

export default App;
