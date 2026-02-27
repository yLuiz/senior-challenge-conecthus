const LOCAL_API_URL = 'http://172.25.96.1:3000/api';
const LOCAL_MQTT_URL = 'ws://localhost:9001';

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function parseUrl(name: string, value: string, protocols: string[]): string {
  const normalized = normalizeUrl(value);

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`[config] ${name} has an invalid URL: ${value}`);
  }

  if (!protocols.includes(parsed.protocol)) {
    throw new Error(`[config] ${name} must use one of: ${protocols.join(', ')}`);
  }

  return normalized;
}

function resolveRequiredUrl(
  name: string,
  rawValue: string | undefined,
  protocols: string[],
  devFallback: string,
): string {
  if (rawValue?.trim()) {
    return parseUrl(name, rawValue, protocols);
  }

  if (__DEV__) {
    return devFallback;
  }

  throw new Error(
    `[config] ${name} is required in release builds. Configure it in EAS environment variables or mobile/eas.json.`,
  );
}

function resolveOptionalUrl(
  name: string,
  rawValue: string | undefined,
  protocols: string[],
  devFallback: string,
): string | null {
  if (rawValue?.trim()) {
    try {
      return parseUrl(name, rawValue, protocols);
    } catch (error) {
      console.warn(String(error));
      return __DEV__ ? devFallback : null;
    }
  }

  return __DEV__ ? devFallback : null;
}

export const API_URL = resolveRequiredUrl(
  'EXPO_PUBLIC_API_URL',
  process.env.EXPO_PUBLIC_API_URL,
  ['http:', 'https:'],
  LOCAL_API_URL,
);

export const MQTT_URL = resolveOptionalUrl(
  'EXPO_PUBLIC_MQTT_URL',
  process.env.EXPO_PUBLIC_MQTT_URL,
  ['ws:', 'wss:'],
  LOCAL_MQTT_URL,
);
