// Ruckus Design Language — adapted from parallel.ai
// Single source of truth for all visual tokens.
// To retheme: change Layer 1 (palette) only.

// ─── Layer 1: Palette ────────────────────────────────────────

export const palette = {
  primary: {
    base: '#FF5C00',      // Parallel safety orange — CTAs, conversion points
    dark: '#E05200',      // Hover state for filled CTAs
    deep: '#8B3209',      // Text on primary-tinted backgrounds
    hover: '#FF7A2E',     // Lighter hover variant
    light: '#FFF4ED',     // Primary tinted background
  },

  neutral: {
    900: '#000000',       // Pure black — main text, headings
    800: '#27272A',       // Charcoal — secondary buttons, deep text
    700: '#3F3F46',       // Dark gray — secondary text
    600: '#52525B',       // Medium-dark — tertiary text
    500: '#71717A',       // Medium gray — muted text, subheadlines
    400: '#A1A1AA',       // Light-medium — labels, disabled
    300: '#D4D4D8',       // Light gray — placeholders
    200: '#E4E4E7',       // Borders, dividers
    150: '#F4F4F5',       // Subtle backgrounds
    100: '#FAFAFA',       // Hover backgrounds
    50: '#FFFFFF',        // Pure white — page background
    0: '#FFFFFF',         // Surface — cards, inputs
  },

  status: {
    rucked: {
      base: '#27272A',      // Parallel charcoal
      bg: '#F4F4F5',
      text: '#27272A',
    },
    ricked: {
      base: '#3B82F6',      // Parallel blue
      bg: '#DBEAFE',
      text: '#1E40AF',
    },
    idle: {
      base: '#A1A1AA',
      bg: '#F4F4F5',
      text: '#52525B',
    },
  },

  feedback: {
    success: {
      base: '#22C55E',
      bg: '#DCFCE7',
      text: '#166534',
    },
    error: {
      base: '#EF4444',
      bg: '#FEE2E2',
      text: '#991B1B',
    },
    info: {
      base: '#3B82F6',
      bg: '#DBEAFE',
      text: '#1E40AF',
    },
  },

  avatar: [
    '#FF5C00', '#3B82F6', '#22C55E', '#9C27B0',
    '#FF4458', '#E05200', '#71717A', '#EF4444',
  ],
} as const;

// ─── Layer 2: Application Mapping ────────────────────────────

export const colors = {
  // Backgrounds
  pageBg: palette.neutral[50],
  surface: palette.neutral[0],
  surfaceHover: palette.neutral[100],
  surfaceActive: palette.neutral[150],
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
  borderFocus: palette.primary.base,
  borderActive: palette.primary.base,

  // Interactive
  accentActive: palette.primary.base,
  accentFocus: palette.primary.dark,
  accentHover: palette.primary.dark,
  accentTint: palette.primary.light,

  // Charcoal button (Parallel "Contact" style)
  charcoalBg: palette.neutral[800],
  charcoalText: palette.neutral[0],

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

const fontSans = "Geist, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const fontMono = "Geist Mono, ui-monospace, 'SF Mono', monospace";

export const typography = {
  // Geist by Vercel — tight apertures, distinctive t/j terminals
  // Falls back to system-ui for native platforms without Geist loaded
  fontFamily: fontSans,
  monoFamily: fontMono,

  // Display — large titles, hero text
  display: {
    fontFamily: fontSans,
    fontSize: 48,
    fontWeight: '600' as const,
    letterSpacing: -1.5,
  },

  // Heading — section titles
  heading: {
    fontFamily: fontSans,
    fontSize: 28,
    fontWeight: '600' as const,
    letterSpacing: -0.8,
  },

  // Subheading — card titles, group names
  subheading: {
    fontFamily: fontSans,
    fontSize: 17,
    fontWeight: '500' as const,
    letterSpacing: -0.2,
  },

  // Body — default text
  body: {
    fontFamily: fontSans,
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },

  // Caption — timestamps, secondary info
  caption: {
    fontFamily: fontSans,
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },

  // Label — badges, section labels
  label: {
    fontFamily: fontSans,
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },

  // Small — helper text
  small: {
    fontFamily: fontSans,
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },

  // Mono — invite codes, keybindings
  mono: {
    fontFamily: fontMono,
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 1,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
  pagePadding: 24,
  cardPadding: 16,
  listItemPaddingY: 14,
  sectionGap: 32,
  heroGap: 120, // generous header-to-content spacing (Parallel editorial feel)
} as const;

export const radii = {
  none: 0,
  sm: 4,       // Buttons, badges — square/hard look
  md: 6,       // Cards, inputs — minimal rounding
  lg: 8,       // Larger cards
  pill: 9999,  // Pill toggles, status badges
  avatar: 9999,
} as const;

export const shadows = {
  // No shadows at rest — border-first elevation (Parallel pattern)
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  cardHover: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
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
