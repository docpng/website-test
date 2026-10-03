// Small checks for content edited in the CMS (src/content). A missing or
// mistyped field fails the build with a clear message instead of
// publishing a broken page.

export function requireFields<T extends object>(
  item: T,
  fields: (keyof T)[],
  source: string
): T {
  for (const field of fields) {
    const value = item[field];
    const empty =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0);
    if (empty) {
      throw new Error(`Content error in ${source}: "${String(field)}" is missing or empty.`);
    }
  }
  return item;
}

export function requireOneOf<T>(value: T, allowed: readonly T[], field: string, source: string): T {
  if (!allowed.includes(value)) {
    throw new Error(
      `Content error in ${source}: "${field}" is "${String(value)}", expected one of: ${allowed.join(", ")}.`
    );
  }
  return value;
}

// Which content file each loaded item came from (used by Arrange mode).
const files = new WeakMap<object, string>();
export const fileOf = (item: object) => files.get(item);

// Loads every JSON file in a CMS folder collection, sorted by "order".
export function loadFolder<T extends { order?: number }>(
  modules: Record<string, unknown>,
  validate: (item: T, source: string) => T
): T[] {
  return Object.entries(modules)
    .map(([path, mod]) => {
      const source = path.replace(/^.*\/content\//, "src/content/");
      const item = validate((mod as { default: T }).default, source);
      files.set(item as object, source);
      return item;
    })
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}
