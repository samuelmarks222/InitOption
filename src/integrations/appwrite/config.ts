// Single Appwrite client for the whole app.
// Reads browser-visible config from VITE_APPWRITE_* env vars (never secrets).
import { Client, Account, type Models } from "appwrite";

const rawAppwriteEndpoint = import.meta.env.VITE_APPWRITE_ENDPOINT as string | undefined;

export const APPWRITE_ENDPOINT =
  rawAppwriteEndpoint && rawAppwriteEndpoint.startsWith("/")
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${rawAppwriteEndpoint}`
    : rawAppwriteEndpoint;
export const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID as string | undefined;

const isValidConfig =
  typeof APPWRITE_ENDPOINT === "string" &&
  APPWRITE_ENDPOINT.trim().length > 0 &&
  typeof APPWRITE_PROJECT_ID === "string" &&
  APPWRITE_PROJECT_ID.trim().length > 0 &&
  !APPWRITE_PROJECT_ID.startsWith("REPLACE");

let client: Client | null = null;
let account: Account | null = null;

if (typeof window !== "undefined" && isValidConfig) {
  client = new Client().setEndpoint(APPWRITE_ENDPOINT!).setProject(APPWRITE_PROJECT_ID!);
  account = new Account(client);
}

export { client, account };
export const appwriteConfigPresent = isValidConfig;

export type AppwriteUser = Models.User<Models.Preferences>;
