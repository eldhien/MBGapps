const JAKARTA_UTC_OFFSET = "+07:00"
const HAS_TIME_ZONE_SUFFIX = /(?:z|[+-]\d{2}:?\d{2})$/i

export function parseJakartaDate(value?: string | null) {
  const normalizedValue = value?.trim()

  if (!normalizedValue) {
    return null
  }

  const dateValue = HAS_TIME_ZONE_SUFFIX.test(normalizedValue)
    ? normalizedValue
    : `${normalizedValue}${JAKARTA_UTC_OFFSET}`
  const date = new Date(dateValue)

  return Number.isNaN(date.getTime()) ? null : date
}

export function parseJakartaDateOrNow(value?: string | null) {
  return parseJakartaDate(value) ?? new Date()
}
