// Deep-maps every `id` key to `_id` so the frontend (which expects Mongo-style
// `_id` fields) keeps working without changes. Nested objects/arrays are handled
// recursively. JSON columns (items/payments/etc.) do not contain `id` keys, so
// they pass through untouched.
function toApi(value) {
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(toApi);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (key === 'id') {
        out._id = toApi(val);
      } else {
        out[key] = toApi(val);
      }
    }
    return out;
  }
  return value;
}

module.exports = { toApi };
