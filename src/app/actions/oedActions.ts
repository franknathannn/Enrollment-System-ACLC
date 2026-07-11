"use server"

import { encrypt, decrypt } from "@/lib/security"

/**
 * Encrypts a plain-text password on the server.
 */
export async function encryptPasswordAction(password: string): Promise<string> {
  return encrypt(password)
}

/**
 * Decrypts an encrypted password string on the server.
 */
export async function decryptPasswordAction(encryptedHex: string): Promise<string> {
  return decrypt(encryptedHex)
}
