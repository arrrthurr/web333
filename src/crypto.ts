const VAULT_KEY = "lw.vault";

const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 310000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface Vault {
  salt: string;
  iv: string;
  data: string;
}

export async function saveMnemonic(mnemonic: string, password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    enc.encode(mnemonic),
  );
  const vault: Vault = {
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(data))),
  };
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
}

export async function loadMnemonic(password: string): Promise<string> {
  const raw = localStorage.getItem(VAULT_KEY);
  if (!raw) throw new Error("No wallet found");
  const vault: Vault = JSON.parse(raw);
  const key = await deriveKey(
    password,
    Uint8Array.from(atob(vault.salt), (c) => c.charCodeAt(0)),
  );
  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: Uint8Array.from(atob(vault.iv), (c) => c.charCodeAt(0)) as BufferSource,
    },
    key,
    Uint8Array.from(atob(vault.data), (c) => c.charCodeAt(0)) as BufferSource,
  );
  return dec.decode(plain);
}

export function hasVault(): boolean {
  return localStorage.getItem(VAULT_KEY) !== null;
}

export function wipeVault() {
  localStorage.removeItem(VAULT_KEY);
}
