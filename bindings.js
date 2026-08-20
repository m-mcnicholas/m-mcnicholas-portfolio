const BINDING_KINDS = ["calf", "cloth", "buckram", "half-leather"];

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * The same semantic record produces the same physical binding everywhere.
 * Explicit data-binding values are optional; otherwise title and date provide
 * stable variation when records are reordered or new records are inserted.
 */
export function getBindingProfile(record, index = 0) {
  const seed = stableHash(`${record.title}|${record.date}|${record.kind}`);
  const requestedKind = record.binding || record.element?.dataset.binding;
  const kind = BINDING_KINDS.includes(requestedKind)
    ? requestedKind
    : BINDING_KINDS[seed % BINDING_KINDS.length];
  const thickness = 0.46 + ((seed >>> 5) % 7) * 0.014;

  return {
    kind,
    seed,
    thickness: record.kind === "info" ? thickness + 0.04 : thickness,
    width: 3.42 + ((seed >>> 9) % 10) * 0.035,
    depth: 2.13 + ((seed >>> 13) % 5) * 0.045,
    rounded: kind === "calf" || kind === "half-leather",
    bands: kind === "calf" ? 3 : kind === "half-leather" ? 2 : 0,
    label: kind === "calf" || kind === "half-leather",
    foil: seed % 4 === 0 ? "blind" : "gilt",
    offset: (((seed >>> 17) % 17) - 8) * 0.014,
    lean: (((seed >>> 22) % 9) - 4) * 0.0023,
    wear: 0.7 + ((seed >>> 25) % 7) * 0.06
  };
}
