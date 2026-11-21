export function shortTicketId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}

export function relativeDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (daysAgo <= 0) {
    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `today · ${time}`;
  }
  if (daysAgo === 1) return 'yesterday';
  if (daysAgo < 30) return `${daysAgo} days ago`;
  return date.toLocaleDateString();
}

export function localDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const localDate = date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const localTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
  return `${localDate}, ${localTime}`;
}
