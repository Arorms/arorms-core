/** Dictionary shape: nested plain objects with string leaves. */
export type Messages = { [key: string]: string | Messages }

export type LanguageDicts<TLanguage extends string> = Record<TLanguage, Messages>

/**
 * Resolve `a.b.c` against a dictionary. Missing keys return the key itself — never throw, because a
 * missing translation must not take a page down.
 *
 * Supports `{{name}}` interpolation from `params`.
 */
export function translate(
  messages: Messages | undefined,
  key: string,
  params?: Record<string, string | number>,
): string {
  let value: unknown = messages
  for (const segment of key.split('.')) {
    if (value && typeof value === 'object' && segment in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[segment]
    } else {
      return key
    }
  }
  if (typeof value !== 'string') return key
  if (!params) return value
  return value.replace(/\{\{(\w+)\}\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  )
}
