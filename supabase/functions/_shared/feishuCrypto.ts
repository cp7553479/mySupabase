// 飞书加密解密工具模块
import { createHash } from "node:crypto";

export function deriveKey(encryptKey: string): ArrayBuffer {
  return createHash("sha256").update(encryptKey, "utf8").digest();
}

// 飞书开放平台事件解密
export async function decryptFeishu(encrypt: string, encryptKey: string): Promise<any> {
  if (!encrypt || typeof encrypt !== "string") {
    throw new Error("Invalid encrypt payload");
  }

  const binaryString = atob(encrypt);
  const raw = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; ++i) {
    raw[i] = binaryString.charCodeAt(i);
  }

  if (raw.length <= 16) {
    throw new Error("Invalid ciphertext: too short");
  }

  const iv = raw.slice(0, 16);
  const ciphertext = raw.slice(16);
  const keyBuffer = deriveKey(encryptKey);

  const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, {
    name: "AES-CBC"
  }, false, ["decrypt"]);

  const decryptedBuffer = await crypto.subtle.decrypt({
    name: "AES-CBC",
    iv
  }, cryptoKey, ciphertext);

  const text = new TextDecoder("utf-8").decode(new Uint8Array(decryptedBuffer));
  
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Decrypted data is not valid JSON");
  }
  
  return json;
}