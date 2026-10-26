/**
 * Verifies this project’s Expo SDK against the Expo Go build required on device.
 *
 * The Android error:
 *   [runtime not ready]: TypeError: Cannot read property 'EventEmitter' of undefined
 * is thrown from expo-modules-core when globalThis.expo was never installed.
 * That happens when the JS bundle (SDK 58) runs inside an Expo Go host that
 * does not successfully provide the matching native Expo runtime.
 *
 * Run: node scripts/check-expo-go-runtime.mjs
 */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const expoPkg = require(join(root, 'node_modules/expo/package.json'));
const modulesCore = require(join(root, 'node_modules/expo-modules-core/package.json'));
const rnPkg = require(join(root, 'node_modules/react-native/package.json'));

const sdkMajor = String(expoPkg.version).split('.')[0];
const expectedGoApk =
  sdkMajor === '58'
    ? 'https://github.com/expo/expo-go-releases/releases/download/Expo-Go-58.0.5/Expo-Go-58.0.5.apk'
    : `https://expo.dev/go?sdkVersion=${sdkMajor}&platform=android&device=true`;

console.log('Expo SDK package:', expoPkg.version);
console.log('expo-modules-core:', modulesCore.version);
console.log('react-native:', rnPkg.version);
console.log('Required Expo Go major:', sdkMajor);
console.log('Android Expo Go APK (matching SDK):', expectedGoApk);
console.log('');
console.log(
  'Root cause mapping: expo-modules-core EventEmitter.js does',
  '`export const EventEmitter = globalThis.expo.EventEmitter` after',
  'ensureNativeModulesAreInstalled(). If Expo Go is the wrong SDK, globalThis.expo',
  'stays undefined and RN prefixes the throw with [runtime not ready].',
);
console.log('');
console.log('Fix on device: install/update Expo Go to SDK', sdkMajor, 'then reload.');
console.log('Download helper: npx expo-go download android', `${sdkMajor}.0.0`);

if (sdkMajor !== '58') {
  console.error('FAIL: expected Expo SDK 58 for this RFScannerExpo tree.');
  process.exit(1);
}

console.log('OK: project SDK aligns with Expo Go 58 requirement.');
