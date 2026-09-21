import { foldAccents } from './text';

// Ordered by specificity.
const EMPLOYMENT_PATTERNS: Array<[RegExp, string]> = [
  [
    /\b(intern|interns|internship|stage|stagiaire|praktikum|becario|estagio)\b/i,
    'INTERNSHIP',
  ],
  [
    /\b(apprentice|apprenticeship|alternance|alternant|apprenti|contrat pro|professionnalisation|ausbildung)\b/i,
    'APPRENTICESHIP',
  ],
  [
    /\b(freelance|independent contractor|auto[- ]entrepreneur|self[- ]employed)\b/i,
    'FREELANCE',
  ],
  [/\b(volunteer|benevolat|service civique)\b/i, 'VOLUNTEER'],
  [
    /\b(temporary|temp|interim|seasonal|saisonnier|cdd|fixed[- ]term|befristet)\b/i,
    'TEMPORARY',
  ],
  [/\b(contract|contractor|contract to hire|w2|c2c)\b/i, 'CONTRACT'],
  [/\b(part[\s_-]?time|temps partiel|teilzeit|medio tiempo)\b/i, 'PART_TIME'],
  [
    /\b(full[\s_-]?time|temps plein|vollzeit|cdi|permanent|regular|tiempo completo)\b/i,
    'FULL_TIME',
  ],
];

export const normalizeEmploymentType = (
  ...values: Array<string | undefined | null>
): string | undefined => {
  for (const value of values) {
    if (!value) continue;
    const text = foldAccents(String(value)).replace(/_/g, ' ');
    for (const [pattern, result] of EMPLOYMENT_PATTERNS) {
      if (pattern.test(text)) return result;
    }
  }
  return undefined;
};
