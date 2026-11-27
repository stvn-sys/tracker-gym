/**
 * Starting nutrition targets from body stats (Mifflin–St Jeor BMR × activity),
 * adjusted for the weekly weight goal (7700 kcal per kg).
 */
export const ACTIVITY = [
  { key: 'sedentary', label: 'Mostly sitting', factor: 1.2 },
  { key: 'light', label: 'Lightly active', factor: 1.375 },
  { key: 'moderate', label: 'Active (training 3–5×/week)', factor: 1.55 },
  { key: 'very', label: 'Very active', factor: 1.725 },
] as const;
export type Activity = (typeof ACTIVITY)[number]['key'];

export function bmr(sex: 'male' | 'female', kg: number, cm: number, age: number) {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === 'male' ? 5 : -161);
}

export function startingTargets(input: { sex: 'male' | 'female'; kg: number; cm: number; age: number; activity: Activity; rateKgWeek: number }) {
  const f = ACTIVITY.find((a) => a.key === input.activity)!.factor;
  const tdee = bmr(input.sex, input.kg, input.cm, input.age) * f;
  const calories = Math.round((tdee + (input.rateKgWeek * 7700) / 7) / 10) * 10;
  const proteinG = Math.round(input.kg * 2);
  const fatG = Math.round((calories * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  return { tdee: Math.round(tdee), calories, proteinG, fatG, carbsG, waterMl: Math.round((input.kg * 35) / 250) * 250 };
}
