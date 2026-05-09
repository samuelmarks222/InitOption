import { COUNTRY_OPTIONS as ALL_COUNTRY_OPTIONS } from "@/lib/country-options";

export type CountryOption = {
  code: string;
  dialCode: string;
  name: string;
};

export const COUNTRY_OPTIONS: CountryOption[] = [...ALL_COUNTRY_OPTIONS];

export const PHONE_COUNTRY_OPTIONS = COUNTRY_OPTIONS.filter((country) => country.dialCode);

const PHONE_COUNTRIES_BY_DIAL_CODE = [...PHONE_COUNTRY_OPTIONS].sort(
  (left, right) => right.dialCode.length - left.dialCode.length || left.name.localeCompare(right.name),
);

export const getCountryOptionByCode = (code?: string | null) =>
  PHONE_COUNTRY_OPTIONS.find((country) => country.code === code) ?? COUNTRY_OPTIONS.find((country) => country.code === code) ?? null;

export const getCountryOptionByName = (name?: string | null) =>
  COUNTRY_OPTIONS.find((country) => country.name === name) ?? null;

export const getCountryOptionByDialCode = (dialCode?: string | null) =>
  PHONE_COUNTRY_OPTIONS.find((country) => country.dialCode === (dialCode ?? "").trim()) ?? null;

export const splitStoredPhoneNumber = (phone?: string | null) => {
  const normalizedPhone = String(phone ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedPhone) {
    return {
      countryCode: "",
      dialCode: "",
      localNumber: "",
    };
  }

  const matchedCountry =
    PHONE_COUNTRIES_BY_DIAL_CODE.find(
      (country) =>
        normalizedPhone === country.dialCode ||
        normalizedPhone.startsWith(`${country.dialCode} `) ||
        normalizedPhone.startsWith(`${country.dialCode}-`) ||
        normalizedPhone.startsWith(country.dialCode),
    ) ?? null;

  if (!matchedCountry) {
    return {
      countryCode: "",
      dialCode: "",
      localNumber: normalizedPhone,
    };
  }

  return {
    countryCode: matchedCountry.code,
    dialCode: matchedCountry.dialCode,
    localNumber: normalizedPhone.slice(matchedCountry.dialCode.length).replace(/^[\s-]+/, ""),
  };
};

export const formatPhoneNumber = (dialCode?: string | null, localNumber?: string | null) => {
  const cleanedNumber = String(localNumber ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const cleanedDialCode = String(dialCode ?? "").trim();

  if (!cleanedNumber) return "";
  if (!cleanedDialCode) return cleanedNumber;

  return `${cleanedDialCode} ${cleanedNumber}`;
};
