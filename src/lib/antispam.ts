// Anti-spam utilities — no external dependencies needed

/**
 * Returns true if the honeypot field was filled (bot detected).
 */
export function isHoneypotFilled(value: string): boolean {
  return value.length > 0;
}

/**
 * Returns true if the form was submitted faster than minimumSeconds after loading (bot detected).
 */
export function isSubmissionTooFast(formLoadedAt: number, minimumSeconds = 3): boolean {
  return (Date.now() - formLoadedAt) < minimumSeconds * 1000;
}

// In-memory rate limiter
const submissions: Record<string, number[]> = {};

/**
 * Returns true if the submission is allowed, false if rate limited.
 */
export function checkRateLimit(formName: string, maxSubmissions = 3, windowSeconds = 60): boolean {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  if (!submissions[formName]) {
    submissions[formName] = [];
  }

  // Clean old entries
  submissions[formName] = submissions[formName].filter(t => now - t < windowMs);

  if (submissions[formName].length >= maxSubmissions) {
    return false;
  }

  submissions[formName].push(now);
  return true;
}
