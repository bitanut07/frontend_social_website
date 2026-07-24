const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const numberFormatter = new Intl.NumberFormat('vi-VN')

export function formatPostDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Không rõ thời gian'
  }

  return dateFormatter.format(date)
}

export function formatReactionCount(value: number): string {
  return numberFormatter.format(Math.max(0, value))
}

export function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) {
    return 'A'
  }

  return words
    .slice(-2)
    .map((word) => word.charAt(0))
    .join('')
    .toLocaleUpperCase('vi-VN')
}
