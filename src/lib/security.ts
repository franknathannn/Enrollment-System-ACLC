import crypto from "crypto"

// We use OED_ENCRYPTION_KEY from environment variables. Must resolve to 32 bytes.
const ENCRYPTION_KEY = process.env.OED_ENCRYPTION_KEY || "fallback_dev_key_32_bytes_long_123456"
const ALGORITHM = "aes-256-gcm"

function getSecureKey(): Buffer {
  let key = ENCRYPTION_KEY
  if (key.length < 32) {
    key = key.padEnd(32, "0")
  } else if (key.length > 32) {
    key = key.slice(0, 32)
  }
  return Buffer.from(key, "utf8")
}

/**
 * Encrypts plain text using AES-256-GCM
 */
export function encrypt(text: string): string {
  if (!text) return text
  
  try {
    const key = getSecureKey()
    const iv = crypto.randomBytes(12) // GCM standard IV size is 12 bytes
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(text, "utf8", "hex")
    encrypted += cipher.final("hex")
    
    const authTag = cipher.getAuthTag().toString("hex")
    
    // Store in format enc:iv:ciphertext:tag to identify as encrypted and unpack cleanly
    return `enc:${iv.toString("hex")}:${encrypted}:${authTag}`
  } catch (error) {
    console.error("Encryption failed:", error)
    return text
  }
}

/**
 * Decrypts AES-256-GCM encrypted text.
 * Gracefully returns original text if not encrypted or if decryption fails (fallback compatibility).
 */
export function decrypt(text: string): string {
  if (!text || !text.startsWith("enc:")) {
    return text
  }

  try {
    const parts = text.split(":")
    if (parts.length !== 4) return text

    const [, ivHex, encryptedHex, authTagHex] = parts
    const key = getSecureKey()
    const iv = Buffer.from(ivHex, "hex")
    const authTag = Buffer.from(authTagHex, "hex")
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8")
    decrypted += decipher.final("utf8")
    
    return decrypted
  } catch (error) {
    // If decryption fails (e.g. key changed, or it wasn't actually encrypted), return original text
    console.warn("Decryption failed, falling back to original string:", error)
    return text
  }
}
