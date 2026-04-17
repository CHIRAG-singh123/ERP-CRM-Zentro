import type { CalendarEvent } from '../services/api/tasks';

const CRLF = '\r\n';
const PROD_ID = '-//Zentro//Calendar//EN';

const PRIORITY_MAP: Record<string, number> = {
  Urgent: 1,
  High: 3,
  Medium: 5,
  Low: 7,
};

const escapeIcsText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');

// RFC 5545 line folding: lines longer than 75 octets are split with CRLF + single space.
const foldLine = (line: string): string => {
  const maxLength = 74;
  if (line.length <= maxLength) return line;

  const parts: string[] = [];
  let index = 0;
  while (index < line.length) {
    const chunk = line.slice(index, index + maxLength);
    parts.push(index === 0 ? chunk : ` ${chunk}`);
    index += maxLength;
  }
  return parts.join(CRLF);
};

const formatUtc = (input: string | Date): string => {
  const date = typeof input === 'string' ? new Date(input) : input;
  const iso = date.toISOString();
  return `${iso.slice(0, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}T${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}Z`;
};

const formatDateOnly = (input: string | Date): string => {
  const date = typeof input === 'string' ? new Date(input) : input;
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const d = `${date.getUTCDate()}`.padStart(2, '0');
  return `${y}${m}${d}`;
};

const buildDescription = (event: CalendarEvent): string => {
  const { description, status, priority, assignedTo } = event.extendedProps || {};
  const lines: string[] = [];
  if (description) lines.push(description);
  if (status) lines.push(`Status: ${status}`);
  if (priority) lines.push(`Priority: ${priority}`);
  if (assignedTo && assignedTo.length > 0) {
    const names = assignedTo
      .map((u) => u?.name || u?.email)
      .filter((n): n is string => Boolean(n));
    if (names.length > 0) lines.push(`Assigned to: ${names.join(', ')}`);
  }
  return lines.join('\n');
};

export interface BuildIcsMeta {
  calName?: string;
}

export const buildCalendarIcs = (events: CalendarEvent[], meta: BuildIcsMeta = {}): string => {
  const dtstamp = formatUtc(new Date());
  const calName = meta.calName ?? 'Zentro tasks';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PROD_ID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldLine(`X-WR-CALNAME:${escapeIcsText(calName)}`),
    foldLine(`NAME:${escapeIcsText(calName)}`),
  ];

  for (const event of events) {
    const uid = `${event.id}@zentro`;
    const summary = escapeIcsText(event.title || 'Untitled task');
    const descriptionRaw = buildDescription(event);
    const description = descriptionRaw ? escapeIcsText(descriptionRaw) : '';
    const priorityNum = PRIORITY_MAP[event.extendedProps?.priority ?? ''];

    lines.push('BEGIN:VEVENT');
    lines.push(foldLine(`UID:${uid}`));
    lines.push(`DTSTAMP:${dtstamp}`);

    if (event.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(event.start)}`);
      lines.push(`DTEND;VALUE=DATE:${formatDateOnly(event.end || event.start)}`);
    } else {
      lines.push(`DTSTART:${formatUtc(event.start)}`);
      lines.push(`DTEND:${formatUtc(event.end || event.start)}`);
    }

    lines.push(foldLine(`SUMMARY:${summary}`));
    if (description) lines.push(foldLine(`DESCRIPTION:${description}`));
    if (event.extendedProps?.status) {
      const status = event.extendedProps.status === 'Done' ? 'COMPLETED' : 'CONFIRMED';
      lines.push(`STATUS:${status}`);
    }
    if (priorityNum) lines.push(`PRIORITY:${priorityNum}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join(CRLF) + CRLF;
};

export const downloadIcs = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};
