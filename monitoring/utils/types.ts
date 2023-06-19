
enum TimePeriods {
    SIX_HOURS = 21600, 
    TWELVE_HOURS = 43200,
    ONE_DAY = 86400,
    TWO_DAYS = 172800,
}

export function getTimePeriods() {
  const now = Math.floor(Date.now() / 1000);  // current Unix timestamp in seconds

  return {
    NOW : now,
    SIX_HOURS: now - 6 * 60 * 60,
    TWELVE_HOURS: now - 12 * 60 * 60,
    ONE_DAY: now - 24 * 60 * 60,
    TWO_DAYS: now - 2 * 24 * 60 * 60,
  };
}
