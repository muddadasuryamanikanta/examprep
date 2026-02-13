/**
 * Shared FSRS Configuration
 * 
 * This file contains the FSRS parameters used by both frontend and backend.
 * Ensures consistency in scheduling calculations and interval predictions.
 */

import type { FSRSParameters } from 'ts-fsrs';
import { generatorParameters } from 'ts-fsrs';

/**
 * Default FSRS Parameters
 * 
 * Configuration based on official FSRS recommendations:
 * - request_retention: 0.9 (90% retention rate - good balance of retention/workload)
 * - maximum_interval: 36500 days (100 years)
 * - enable_fuzz: true (adds randomization to prevent pattern formation)
 * - enable_short_term: true (uses standard FSRS short-term handling)
 */
export function getFSRSParams(): FSRSParameters {
  const params = generatorParameters({
    request_retention: 0.85,     // 85% target retention rate (Widened intervals)
    maximum_interval: 36500,     // 100 years in days
    enable_fuzz: true,           // Enable interval randomization
    enable_short_term: true,    // Use standard FSRS short-term handling
  });

  // Explicitly set steps (minutes)
  // ts-fsrs uses these for Short Term scheduling. They must be strings like "1m", "10m".
  // We use 'as any' casting to bypass potential type mismatch if FSRSParameters strict type doesn't include these fields explicitly in the installed version.
  (params as any).learning_steps = DEFAULT_LEARNING_STEPS.map(s => `${s}m`);
  (params as any).relearning_steps = DEFAULT_RELEARNING_STEPS.map(s => `${s}m`);
  
  return params;
}

/**
 * Learning Steps Configuration (in minutes)
 * 
 * IMPORTANT: All steps MUST be < 1440 minutes (24 hours) per FSRS spec
 * Default: [1, 10] = 1 minute, then 10 minutes
 * Anki recommendation: Use steps like 10m or 30m (not 23h)
 */
export const DEFAULT_LEARNING_STEPS = [1, 10]; // minutes

/**
 * Relearning Steps Configuration (in minutes)
 * 
 * Steps used when a card lapses (rated "Again" in Review state)
 * Default: [10] = 10 minutes
 */
export const DEFAULT_RELEARNING_STEPS = [10]; // minutes

/**
 * Validates that learning steps are all < 1 day
 */
export function validateLearningSteps(steps: number[]): { valid: boolean; error?: string } {
  const ONE_DAY_MINUTES = 1440;
  
  for (const step of steps) {
    if (step >= ONE_DAY_MINUTES) {
      return {
        valid: false,
        error: `Learning step ${step} minutes exceeds 1 day (1440 minutes). All steps must be < 24 hours.`
      };
    }
    if (step <= 0) {
      return {
        valid: false,
        error: `Learning step ${step} minutes must be positive.`
      };
    }
  }
  
  return { valid: true };
}

/**
 * Graduating interval (in days)
 * Interval when card graduates from learning
 */
export const GRADUATING_INTERVAL_DAYS = 1;

/**
 * Easy interval (in days)
 * Interval when new card is rated "Easy" immediately
 */
export const EASY_INTERVAL_DAYS = 4;

/**
 * Convert minutes to milliseconds
 */
export function minutesToMs(minutes: number): number {
  return minutes * 60 * 1000;
}

/**
 * Convert days to milliseconds
 */
export function daysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

/**
 * Format interval in milliseconds to human-readable label
 */
export function formatInterval(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `<${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}
