export const MINIMUM_PARTICIPATION_AGE = 18;
export const PARTICIPATION_TIME_ZONE = 'America/Sao_Paulo';

type CivilDate = { year: number; month: number; day: number };

function civilDateAt(instant: Date, timeZone: string): CivilDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: value('year'), month: value('month'), day: value('day') };
}

function parseBirthDate(value: string): CivilDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const parsed = { year: Number(year), month: Number(month), day: Number(day) };
  const roundTrip = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  if (
    roundTrip.getUTCFullYear() !== parsed.year ||
    roundTrip.getUTCMonth() + 1 !== parsed.month ||
    roundTrip.getUTCDate() !== parsed.day
  )
    return null;
  return parsed;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function latestEligibleBirthDate(
  minimumAge = MINIMUM_PARTICIPATION_AGE,
  instant = new Date(),
  timeZone = PARTICIPATION_TIME_ZONE,
): string {
  const today = civilDateAt(instant, timeZone);
  return `${today.year - minimumAge}-${pad(today.month)}-${pad(today.day)}`;
}

export function isAtLeastAge(
  birthDate: string,
  minimumAge = MINIMUM_PARTICIPATION_AGE,
  instant = new Date(),
  timeZone = PARTICIPATION_TIME_ZONE,
): boolean {
  if (!Number.isInteger(minimumAge) || minimumAge < 0) return false;
  const birth = parseBirthDate(birthDate);
  if (!birth) return false;
  const today = civilDateAt(instant, timeZone);
  let age = today.year - birth.year;
  if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) age--;
  return age >= minimumAge;
}
