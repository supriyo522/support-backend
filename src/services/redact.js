// Strip sensitive data before anything is sent to the AI provider.
export function redact(text) {
  return text
    .replace(/\b(?:\d[ -]?){13,19}\b/g, '[REDACTED_CARD]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
    .replace(/(password|passwd|pwd|otp|pin|cvv)\s*(is|:|=)?\s*\S+/gi, '$1 [REDACTED]');
}
