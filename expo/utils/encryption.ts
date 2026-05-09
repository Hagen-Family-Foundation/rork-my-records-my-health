import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { gcm } from '@noble/ciphers/aes';
import { bytesToHex, hexToBytes } from '@noble/ciphers/utils';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY_ID = 'myrecords_enc_key_v2';
const LEGACY_ENCRYPTION_KEY_ID = 'myrecords_enc_key';

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getOrCreateEncryptionKey(): Promise<Uint8Array> {
  try {
    const existing = await SecureStore.getItemAsync(ENCRYPTION_KEY_ID);
    if (existing) {
      console.log('[Encryption] Retrieved AES-256-GCM key from SecureStore (Keychain/Keystore)');
      return hexToBytes(existing);
    }
  } catch (e) {
    console.log('[Encryption] Could not retrieve v2 key from SecureStore:', e);
  }

  const keyBytes = Crypto.getRandomBytes(32);
  const keyHex = bytesToHex(keyBytes);

  try {
    await SecureStore.setItemAsync(ENCRYPTION_KEY_ID, keyHex);
    console.log('[Encryption] Generated new AES-256 key (CSPRNG, 256-bit) and stored in SecureStore');
  } catch (e) {
    console.error('[Encryption] CRITICAL: Failed to store encryption key in SecureStore:', e);
    throw new Error('Cannot create encryption key — SecureStore unavailable. Data will not be saved unencrypted.');
  }

  return keyBytes;
}

async function getKeyHex(): Promise<string> {
  const keyBytes = await getOrCreateEncryptionKey();
  return bytesToHex(keyBytes);
}

async function getLegacyKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(LEGACY_ENCRYPTION_KEY_ID);
  } catch {
    return null;
  }
}

function legacyXorDecrypt(data: string, key: string): string {
  const result: string[] = [];
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result.push(String.fromCharCode(charCode));
  }
  return result.join('');
}

function legacyFromBase64(b64: string): string {
  if (Platform.OS === 'web') {
    return decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const cleaned = b64.replace(/[^A-Za-z0-9+/]/g, '');
  for (let i = 0; i < cleaned.length; i += 4) {
    const a = chars.indexOf(cleaned[i]);
    const b = chars.indexOf(cleaned[i + 1]);
    const c = chars.indexOf(cleaned[i + 2]);
    const d = chars.indexOf(cleaned[i + 3]);
    const triplet = (a << 18) | (b << 12) | (c << 6) | d;
    result += String.fromCharCode((triplet >> 16) & 0xff);
    if (c !== -1 && cleaned[i + 2] !== '=') result += String.fromCharCode((triplet >> 8) & 0xff);
    if (d !== -1 && cleaned[i + 3] !== '=') result += String.fromCharCode(triplet & 0xff);
  }
  return result;
}

async function decryptLegacyXor(ciphertext: string): Promise<string | null> {
  try {
    const legacyKey = await getLegacyKey();
    if (!legacyKey) {
      console.log('[Encryption] No legacy XOR key found in SecureStore');
      return null;
    }
    const encoded = ciphertext.substring(4);
    const encrypted = legacyFromBase64(encoded);
    const decrypted = legacyXorDecrypt(encrypted, legacyKey);
    console.log('[Encryption] Legacy XOR data decrypted — will re-encrypt as AES-256-GCM on next save');
    return decrypted;
  } catch (e) {
    console.error('[Encryption] Legacy XOR decryption failed:', e);
    return null;
  }
}

async function decryptLegacyAesCbc(ciphertext: string): Promise<string> {
  try {
    const keyHex = await getKeyHex();
    const payload = ciphertext.substring(4);
    const separatorIndex = payload.indexOf(':');

    if (separatorIndex === -1) {
      throw new Error('Invalid AES-CBC ciphertext format — missing IV separator');
    }

    const ivHex = payload.substring(0, separatorIndex);
    const ciphertextBase64 = payload.substring(separatorIndex + 1);

    const key = CryptoJS.enc.Hex.parse(keyHex);
    const iv = CryptoJS.enc.Hex.parse(ivHex);

    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(ciphertextBase64),
    });

    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

    if (!plaintext) {
      throw new Error('Legacy AES-CBC decryption produced empty output — possible key mismatch');
    }

    console.log('[Encryption] Legacy AES-CBC data decrypted — will re-encrypt as AES-256-GCM on next save');
    return plaintext;
  } catch (e) {
    console.error('[Encryption] Legacy AES-CBC decryption failed:', e);
    throw new Error('Legacy decryption failed — encryption key may have changed. Data is preserved but unreadable with current key.');
  }
}

export async function encryptData(plaintext: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();
    const nonceBytes = Crypto.getRandomBytes(12);
    const nonceHex = bytesToHex(nonceBytes);

    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const aes = gcm(key, nonceBytes);
    const ciphertextWithTag = aes.encrypt(data);

    const ciphertextBase64 = uint8ArrayToBase64(ciphertextWithTag);

    console.log('[Encryption] Encrypted with AES-256-GCM (nonce: 96-bit, tag: 128-bit, key: 256-bit)');
    return 'GCM:' + nonceHex + ':' + ciphertextBase64;
  } catch (e) {
    console.error('[Encryption] AES-256-GCM encryption failed:', e);
    throw new Error('Encryption failed — data not saved to protect your privacy. Never falling back to plaintext.');
  }
}

async function decryptGcm(ciphertext: string): Promise<string> {
  try {
    const key = await getOrCreateEncryptionKey();
    const payload = ciphertext.substring(4);
    const separatorIndex = payload.indexOf(':');

    if (separatorIndex === -1) {
      throw new Error('Invalid GCM ciphertext format — missing nonce separator');
    }

    const nonceHex = payload.substring(0, separatorIndex);
    const ciphertextBase64 = payload.substring(separatorIndex + 1);

    const nonceBytes = hexToBytes(nonceHex);
    const ciphertextBytes = base64ToUint8Array(ciphertextBase64);

    const aes = gcm(key, nonceBytes);
    const plainBytes = aes.decrypt(ciphertextBytes);

    const decoder = new TextDecoder();
    const plaintext = decoder.decode(plainBytes);

    console.log('[Encryption] Decrypted with AES-256-GCM (auth tag verified, integrity confirmed)');
    return plaintext;
  } catch (e) {
    console.error('[Encryption] AES-256-GCM decryption/auth failed:', e);
    throw new Error('Decryption failed — authentication tag verification failed or key mismatch. Data integrity cannot be confirmed.');
  }
}

export async function decryptData(ciphertext: string): Promise<string> {
  if (ciphertext.startsWith('GCM:')) {
    return decryptGcm(ciphertext);
  }

  if (ciphertext.startsWith('AES:')) {
    console.log('[Encryption] Detected legacy AES-CBC data — decrypting for migration to AES-256-GCM');
    return decryptLegacyAesCbc(ciphertext);
  }

  if (ciphertext.startsWith('ENC:')) {
    console.log('[Encryption] Detected legacy XOR data — decrypting for migration to AES-256-GCM');
    const decrypted = await decryptLegacyXor(ciphertext);
    if (decrypted) {
      return decrypted;
    }
    throw new Error('Legacy XOR decryption failed — no legacy key available');
  }

  try {
    JSON.parse(ciphertext);
    console.log('[Encryption] Detected unencrypted JSON — will encrypt as AES-256-GCM on next save');
    return ciphertext;
  } catch {
    throw new Error('Stored data is in an unrecognized format and cannot be decrypted');
  }
}

export async function isEncryptionAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export function getEncryptionInfo(): {
  algorithm: string;
  keySize: string;
  mode: string;
  nonceSize: string;
  tagSize: string;
  keyGeneration: string;
  keyStorage: string;
  library: string;
  threatModel: string;
  migrationBehavior: string;
} {
  return {
    algorithm: 'AES-256-GCM',
    keySize: '256-bit (32 bytes)',
    mode: 'Galois/Counter Mode (authenticated encryption with associated data)',
    nonceSize: '96-bit (12 bytes) random nonce per encryption operation',
    tagSize: '128-bit authentication tag (generated and verified automatically)',
    keyGeneration: 'expo-crypto getRandomBytes (CSPRNG — platform-native secure random)',
    keyStorage: 'expo-secure-store (iOS Keychain / Android Keystore) — never in AsyncStorage',
    library: '@noble/ciphers (audited, pure JS, actively maintained by paulmillr)',
    threatModel: 'Authenticated encryption provides confidentiality + integrity. Detects tampering, truncation, or key mismatch. Key is hardware-protected via OS keychain/keystore. Protects against casual device access, filesystem extraction, backup analysis, and data modification.',
    migrationBehavior: 'Legacy XOR (ENC:), AES-CBC (AES:), and plain JSON records are automatically decrypted and re-encrypted as AES-256-GCM on next save. No silent fallback to plaintext.',
  };
}
