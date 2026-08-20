export const WEEK_DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export const MEAL_TYPES = ["Desayuno", "Almuerzo", "Cena", "Otro"] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];
export type MealType = (typeof MEAL_TYPES)[number];

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function mondayOf(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00.000Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return toIsoDate(date);
}

export function getCurrentMonday() {
  return mondayOf(toIsoDate(new Date()));
}

export function parseMonday(value: string | undefined) {
  if (!value || !isoDatePattern.test(value)) return getCurrentMonday();
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.getUTCFullYear() >= 1 &&
    toIsoDate(date) === value &&
    date.getUTCDay() === 1
    ? value
    : getCurrentMonday();
}

export function addWeeks(week: string, amount: number) {
  const date = new Date(`${week}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount * 7);
  return toIsoDate(date);
}

export function addDays(week: string, amount: number) {
  const date = new Date(`${week}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date;
}

export function isWeekDay(value: string): value is WeekDay {
  return WEEK_DAYS.includes(value as WeekDay);
}

export function isMealType(value: string): value is MealType {
  return MEAL_TYPES.includes(value as MealType);
}

export function menuSlotKey(day: WeekDay, meal: MealType) {
  return `${day}|${meal}`;
}

export function formatWeekDay(week: string, dayIndex: number) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(addDays(week, dayIndex));
}
