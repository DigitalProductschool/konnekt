// Mirrors Option and OptionSet in backend/app/schemas.py

/** A value of an enum field or part: a country code, a sex code, a licence class... */
export interface Option {
  value: string | number;
  label: string;
  description: string | null;
}

/** The values an enum field or part can have (GET /api/option-sets) */
export interface OptionSet {
  key: string;
  options: Option[];
}
