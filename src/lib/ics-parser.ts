export interface ParsedIcsEvent {
  id: string;
  summary: string;
  unitCode?: string;
  dueDate: string;
  description?: string;
  isAssessment: boolean;
  tag?: 'lab' | 'quiz' | 'tutorial' | 'reading' | 'general';
}

export function parseIcsContent(icsData: string): ParsedIcsEvent[] {
  if (!icsData || typeof icsData !== 'string') return [];

  const events: ParsedIcsEvent[] = [];
  const lines = icsData.split(/\r\n|\n|\r/);
  
  let inEvent = false;
  let currentEvent: {
    id?: string;
    summary?: string;
    rawDate?: string;
    description?: string;
  } = {};

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Unfold multi-line iCalendar properties (lines starting with space or tab)
    while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
      line += lines[i + 1].substring(1);
      i++;
    }

    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      currentEvent = {};
    } else if (line.startsWith('END:VEVENT')) {
      if (inEvent && currentEvent.summary) {
        const fullText = `${currentEvent.summary} ${currentEvent.description || ''}`;

        // Extract unit code if present (e.g., "[AMME3500]" or "ELEC1601 - " or "INFO1110")
        const codeMatch = fullText.match(/\b([A-Z]{4}[0-9]{4})\b/i);
        const unitCode = codeMatch ? codeMatch[1].toUpperCase() : undefined;

        // Determine if it's a graded assessment or general event
        const isAssessment = /assignment|exam|quiz|project|lab report|submission|hurdle|test|midterm|final/i.test(
          fullText
        );

        let tag: 'lab' | 'quiz' | 'tutorial' | 'reading' | 'general' = 'general';
        if (/lab|laboratory|bench|breadboard/i.test(fullText)) tag = 'lab';
        else if (/quiz|test|exam|midterm/i.test(fullText)) tag = 'quiz';
        else if (/tutorial|workshop|seminar/i.test(fullText)) tag = 'tutorial';
        else if (/reading|pre-work|preparation/i.test(fullText)) tag = 'reading';

        // Clean summary (remove bracketed unit codes if duplicated)
        let cleanSummary = currentEvent.summary
          .replace(/\[[A-Z]{4}[0-9]{4}\]/gi, '')
          .replace(/^[A-Z]{4}[0-9]{4}\s*[-:]\s*/i, '')
          .trim();

        if (!cleanSummary) cleanSummary = currentEvent.summary;

        events.push({
          id: currentEvent.id || `canvas-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          summary: cleanSummary,
          unitCode,
          dueDate: formatIcsDate(currentEvent.rawDate),
          description: currentEvent.description,
          isAssessment,
          tag,
        });
      }
      inEvent = false;
    } else if (inEvent) {
      if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8).trim().replace(/\\,/g, ',').replace(/\\;/g, ';');
      } else if (line.startsWith('UID:')) {
        currentEvent.id = line.substring(4).trim();
      } else if (line.startsWith('DTEND') || line.startsWith('DTSTART') || line.startsWith('DUE')) {
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1 && !currentEvent.rawDate) {
          currentEvent.rawDate = line.substring(colonIndex + 1).trim();
        }
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.description = line
          .substring(12)
          .trim()
          .replace(/\\n/g, ' ')
          .replace(/\\,/g, ',')
          .replace(/\\;/g, ';');
      }
    }
  }

  // Deduplicate by summary + dueDate
  const seen = new Set<string>();
  const uniqueEvents: ParsedIcsEvent[] = [];
  for (const e of events) {
    const key = `${e.unitCode || ''}:${e.summary}:${e.dueDate}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEvents.push(e);
    }
  }

  return uniqueEvents.slice(0, 50);
}

function formatIcsDate(rawDate?: string): string {
  if (!rawDate) return 'Upcoming';

  // Format: 20260415T135900Z or 20260415
  const match = rawDate.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?/);
  if (!match) return rawDate;

  const [, year, month, day, hour, min] = match;
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const monthName = monthNames[parseInt(month, 10) - 1] || month;

  if (hour && min) {
    return `${day} ${monthName} ${year}, ${hour}:${min}`;
  }
  return `${day} ${monthName} ${year}`;
}
