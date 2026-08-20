// Encodes {code, language, indentSize} into a URL-safe base64 string carried
// in the location hash (never sent to a server, so there's no length limit
// beyond the browser's own address-bar handling) — no backend or database
// needed for "sharing" a snippet.

export function encodeShareState({ code, language, indentSize }) {
  const json = JSON.stringify({ code, language, indentSize });
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShareState(encoded) {
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const obj = JSON.parse(json);
    if (typeof obj.code !== "string" || typeof obj.language !== "string") return null;
    return obj;
  } catch {
    return null;
  }
}
