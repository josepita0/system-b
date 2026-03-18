export function resolveShiftForDate(date: Date) {
  const minutes = date.getHours() * 60 + date.getMinutes()
  if (minutes >= 10 * 60 && minutes < 19 * 60) {
    return 'day' as const
  }

  return 'night' as const
}
