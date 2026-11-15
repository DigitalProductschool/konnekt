import { createHash } from 'node:crypto';

/** JSON with sorted keys and no whitespace, so equal content always hashes equally */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * The version fingerprint: SHA-256 over what the PDF describes (keys, not labels or language),
 * shown as 12 hex digits in groups of four. Status, URLs, the draft's save counter and the
 * generation time are left out: they aren't the connection's content.
 */
export function fingerprintOf(connection) {
  // No URLs: a draft has none, and they follow from the IDs, which publishing keeps (spec 007
  // R10). So a draft published unchanged keeps the version its review PDF showed
  const content = {
    id: connection.id,
    name: connection.name,
    description: connection.description,
    documents: connection.documents.map((doc) => ({
      document_type: doc.document_type,
      fields: doc.fields.map(([key]) => key),
    })),
    branches: connection.branches.map(({ pull_url: _url, ...branch }) => branch),
  };
  const hex = createHash('sha256').update(canonical(content)).digest('hex').toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}
