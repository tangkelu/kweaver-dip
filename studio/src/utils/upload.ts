/**
 * Multipart upload helpers.
 */

/**
 * Repairs a filename when upstream multipart parsing decoded raw UTF-8 bytes as latin1.
 *
 * @param originalname The filename parsed by `multer`.
 * @returns The repaired filename when the input matches the common mojibake pattern; otherwise the original value.
 */
export function normalizeMultipartFilename(originalname: string): string {
  if (!containsNonAscii(originalname)) {
    return originalname;
  }

  const decoded = Buffer.from(originalname, "latin1").toString("utf8");
  if (!isLosslessLatin1Utf8RoundTrip(originalname, decoded)) {
    return originalname;
  }

  return decoded;
}

/**
 * Checks whether a string contains any non-ASCII character.
 *
 * @param value Input string.
 * @returns Whether the string contains at least one code point above ASCII range.
 */
export function containsNonAscii(value: string): boolean {
  return /[^\x00-\x7F]/.test(value);
}

/**
 * Verifies that decoding as `latin1 -> utf8` produced a lossless round-trip back to the original bytes.
 *
 * @param originalname Original string value.
 * @param decoded Candidate UTF-8 decoded value.
 * @returns Whether the candidate can be re-encoded back to the original latin1 byte sequence without loss.
 */
export function isLosslessLatin1Utf8RoundTrip(
  originalname: string,
  decoded: string
): boolean {
  if (decoded.includes("\uFFFD")) {
    return false;
  }

  return Buffer.from(decoded, "utf8").toString("latin1") === originalname;
}
