function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}
/** Web Crypto port of the prototype's fingerprint, to check it matches Node's */
export async function fingerprintOf(connection) {
  const content = {
    id: connection.id, name: connection.name, description: connection.description,
    documents: connection.documents.map((doc) => ({ document_type: doc.document_type, fields: doc.fields.map(([key]) => key) })),
    branches: connection.branches.map(({ pull_url: _url, ...branch }) => branch),
  };
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(content)));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}
