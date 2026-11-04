import { COUNTRY_OPTIONS } from "./country-options.js";
/** Shared client/server rules. A submission is never an automatic identity approval. */
export const IDENTITY_FILE_LIMIT = 2 * 1024 * 1024;
export const IDENTITY_TYPES = [
  "national_id",
  "passport",
  "driving_licence",
] as const;
export type IdentityType = (typeof IDENTITY_TYPES)[number];
export type IdentityStatus = "Draft" | "Submitted" | "Verified" | "Rejected";
export interface AccountDetails {
  username: string;
  firstName: string;
  lastName: string;
  dob: string;
  country: string;
  phone: string;
  address: string;
}
export const EMPTY_ACCOUNT: AccountDetails = {
  username: "",
  firstName: "",
  lastName: "",
  dob: "",
  country: "",
  phone: "",
  address: "",
};
export const requiredIdentitySlots = (type: string): ("front" | "back")[] =>
  type === "passport" ? ["front"] : ["front", "back"];
export function validateAccount(
  value: unknown,
  now = new Date(),
): AccountDetails {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Enter your personal details.");
  const input = value as Record<string, unknown>;
  const result = { ...EMPTY_ACCOUNT };
  for (const key of Object.keys(result) as (keyof AccountDetails)[]) {
    if (typeof input[key] !== "string") throw new Error(`Enter ${key}.`);
    result[key] = input[key].trim();
  }
  if (!/^[\p{L}\p{N}_.-]{3,30}$/u.test(result.username))
    throw new Error(
      "Username must be 3–30 letters, numbers, dots, underscores or hyphens.",
    );
  if (
    [result.firstName, result.lastName].some(
      (name) => name.length < 1 || name.length > 80 || !/\p{L}/u.test(name),
    )
  )
    throw new Error(
      "Enter your legal first and last names (up to 80 characters each).",
    );
  const date = new Date(`${result.dob}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result.dob) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== result.dob
  )
    throw new Error("Enter a valid date of birth.");
  const oldest = new Date(
    Date.UTC(now.getUTCFullYear() - 120, now.getUTCMonth(), now.getUTCDate()),
  );
  const adult = new Date(
    Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()),
  );
  if (date > adult || date < oldest)
    throw new Error("You must be at least 18. Check your date of birth.");
  if (!COUNTRY_OPTIONS.some((country) => country.name === result.country))
    throw new Error("Select your country of residence.");
  if (
    !/^\+[1-9][\d ()-]{6,23}$/.test(result.phone) ||
    result.phone.replace(/\D/g, "").length < 7 ||
    result.phone.replace(/\D/g, "").length > 15
  )
    throw new Error(
      "Enter a phone number with country code, such as +254712345678.",
    );
  if (result.address.length < 5 || result.address.length > 240)
    throw new Error("Enter your residential address (5–240 characters).");
  return result;
}
export function validateIdentity(value: unknown) {
  const input = value as Record<string, unknown> | null;
  const type = input?.documentType;
  if (!IDENTITY_TYPES.includes(type as IdentityType))
    throw new Error("Choose a supported document type.");
  const number =
    typeof input?.documentNumber === "string"
      ? input.documentNumber.trim()
      : "";
  if (!/^[\p{L}\p{N} /.-]{3,40}$/u.test(number))
    throw new Error("Enter a valid document number (3–40 characters).");
  if (input?.consent !== true)
    throw new Error(
      "Confirm that these are your documents and allow identity review.",
    );
  return { documentType: type as IdentityType, documentNumber: number };
}
