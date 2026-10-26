/**
 * Centralized brand configuration.
 * Change APP_NAME or APP_TAGLINE here to rename the entire application cleanly.
 */
export const BRAND = {
  name: 'Daylight',
  tagline: 'Your Daily Reset',
  fullTitle: 'Daylight — Your Daily Reset',
  shortDescription:
    'A calm, private daily intentions journal and progress tracker. Write down what matters each morning, check off goals as you go, and watch your consistency compound.',
  storageSchemaVersion: 1,
  maxGoalsPerDay: 50,
  maxGoalLength: 280,
  maxReflectionLength: 5000,
  maxDisplayNameLength: 100,
} as const;
