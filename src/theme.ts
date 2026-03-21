// Ruckus Design Language — adapted from parallel.ai
// Single source of truth for all visual tokens.
// To retheme: change Layer 1 (palette) only.

// ─── Layer 1: Palette ────────────────────────────────────────

export const palette = {
  primary: {
    base: '#FB631B',
    dark: '#D94E0F',
    deep: '#8B3209',
    hover: '#FF590A',
    light: '#FFF0E8',
  },

  neutral: {
    900: '#181818',
    700: '#434343',
    600: '#666666',
    500: '#858483',
    400: '#ADADAC',
    300: '#C8C7C3',
    200: '#E5E5E5',
    150: '#EEEEEE',
    100: '#F5F5F5',
    75: '#F5F4F1',
    50: '#FAFAF8',
    0: '#FFFFFF',
  },

  status: {
    rucked: {
      base: '#FF4458',
      bg: '#FFE8EA',
      text: '#9B1B2B',
    },
    ricked: {
      base: '#9C27B0',
      bg: '#F3E5F5',
      text: '#6A1B7B',
    },
    idle: {
      base: '#ADADAC',
      bg: '#F5F5F5',
      text: '#666666',
    },
  },

  feedback: {
    success: {
      base: '#69BE78',
      bg: '#E8F5E9',
      text: '#1B5E20',
    },
    error: {
      base: '#E13F44',
      bg: '#FFE8E8',
      text: '#7B0000',
    },
    info: {
      base: '#6FA2E8',
      bg: '#E9F0F5',
      text: '#1A4B7A',
    },
  },

  avatar: [
    '#FB631B', '#6FA2E8', '#69BE78', '#9C27B0',
    '#FF4458', '#D94E0F', '#858483', '#E13F44',
  ],
} as const;

// ─── Layer 2: Application Mapping ────────────────────────────

export const colors = {
  // Backgrounds
  pageBg: palette.neutral[50],
  surface: palette.neutral[0],
  surfaceHover: palette.neutral[100],
  surfaceActive: palette.neutral[75],
  surfaceMuted: palette.neutral[150],
  bannerBg: palette.primary.base,

  // Text
  textPrimary: palette.neutral[900],
  textSecondary: palette.neutral[700],
  textTertiary: palette.neutral[600],
  textMuted: palette.neutral[500],
  textLabel: palette.neutral[400],
  textPlaceholder: palette.neutral[300],
  textInverse: palette.neutral[0],

  // Borders
  borderDefault: palette.neutral[200],
  borderSubtle: palette.neutral[150],
  borderFocus: palette.primary.dark,
  borderActive: palette.primary.base,

  // Interactive
  accentActive: palette.primary.base,
  accentFocus: palette.primary.dark,
  accentHover: palette.primary.hover,
  accentTint: palette.primary.light,

  // Status
  ruckedFill: palette.status.rucked.base,
  ruckedBg: palette.status.rucked.bg,
  ruckedText: palette.status.rucked.text,
  rickedFill: palette.status.ricked.base,
  rickedBg: palette.status.ricked.bg,
  rickedText: palette.status.ricked.text,

  // Progress
  cooldownTrack: palette.neutral[200],
} as const;

// ─── Layer 3: System Rules ───────────────────────────────────

export const typography = {
  fontFamily: undefined, // system default
  monoFamily: 'monospace' as const,

  display: { fontSize: 36, fontWeight: '500' as const },
  heading: { fontSize: 26, fontWeight: '500' as const },
  subheading: { fontSize: 16, fontWeight: '500' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  caption: { fontSize: 14, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '500' as const },
  small: { fontSize: 11, fontWeight: '400' as const },
  mono: { fontSize: 13, fontWeight: '400' as const },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  pagePadding: 20,
  cardPadding: 16,
  listItemPaddingY: 12,
  sectionGap: 24,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 9999,
  avatar: 9999,
} as const;

export const shadows = {
  card: {
    shadowColor: palette.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHover: {
    shadowColor: palette.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────

export function getStatusColor(status: 'rucked' | 'ricked' | null) {
  if (status === 'rucked') return palette.status.rucked.base;
  if (status === 'ricked') return palette.status.ricked.base;
  return palette.status.idle.base;
}

export function getStatusBg(status: 'rucked' | 'ricked' | null) {
  if (status === 'rucked') return palette.status.rucked.bg;
  if (status === 'ricked') return palette.status.ricked.bg;
  return palette.status.idle.bg;
}

export function getStatusText(status: 'rucked' | 'ricked' | null) {
  if (status === 'rucked') return palette.status.rucked.text;
  if (status === 'ricked') return palette.status.ricked.text;
  return palette.status.idle.text;
}

export function getAvatarColor(index: number) {
  return palette.avatar[index % palette.avatar.length];
}
