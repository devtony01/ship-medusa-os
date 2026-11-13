export type JSONPrimitive = string | number | boolean | null;

export type CustomErrors = Record<string, JSONPrimitive | JSONPrimitive[]>;

export type ValidationErrors = Record<string, string[]>;
