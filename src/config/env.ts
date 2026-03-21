export const SUPABASE_PUBLIC_ENV_KEYS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
] as const;

export const REQUIRED_PUBLIC_ENV_KEYS = [
  ...SUPABASE_PUBLIC_ENV_KEYS,
  'EXPO_PUBLIC_PROJECT_ID',
] as const;

export type RequiredPublicEnvKey = (typeof REQUIRED_PUBLIC_ENV_KEYS)[number];
export type RequiredSupabaseEnvKey = (typeof SUPABASE_PUBLIC_ENV_KEYS)[number];

export interface EnvValidationResult<Key extends string = RequiredPublicEnvKey> {
  valid: boolean;
  missingKeys: Key[];
  values: Record<Key, string | undefined>;
}

function readPublicEnvValue(key: string): string | undefined {
  const rawValue = process.env[key];
  if (typeof rawValue !== 'string') return undefined;

  const value = rawValue.trim();
  return value.length > 0 ? value : undefined;
}

function validateKeys<Key extends RequiredPublicEnvKey>(
  keys: readonly Key[]
): EnvValidationResult<Key> {
  const values = {} as Record<Key, string | undefined>;
  const missingKeys: Key[] = [];

  for (const key of keys) {
    const value = readPublicEnvValue(key);
    values[key] = value;

    if (!value) {
      missingKeys.push(key);
    }
  }

  return {
    valid: missingKeys.length === 0,
    missingKeys,
    values,
  };
}

export function validatePublicEnv(): EnvValidationResult<RequiredPublicEnvKey> {
  return validateKeys(REQUIRED_PUBLIC_ENV_KEYS);
}

export function validateSupabasePublicEnv(): EnvValidationResult<RequiredSupabaseEnvKey> {
  return validateKeys(SUPABASE_PUBLIC_ENV_KEYS);
}
