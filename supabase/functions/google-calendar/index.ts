import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CalEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location: string | null;
  allDay: boolean;
}

function parseICalDate(value: string): { dateTime: string; allDay: boolean } {
  // All-day: DTSTART;VALUE=DATE:20260215
  if (value.length === 8) {
    return { dateTime: `${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`, allDay: true };
  }
  // DateTime: 20260215T100000Z or 20260215T100000
  const y = value.slice(0,4), m = value.slice(4,6), d = value.slice(6,8);
  const h = value.slice(9,11), mi = value.slice(11,13), s = value.slice(13,15);
  const tz = value.endsWith('Z') ? 'Z' : '';
  return { dateTime: `${y}-${m}-${d}T${h}:${mi}:${s}${tz}`, allDay: false };
}

function parseICal(ical: string, filterDate: string): CalEvent[] {
  const events: CalEvent[] = [];
  const blocks = ical.split('BEGIN:VEVENT');
  
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0];
    const lines: string[] = [];
    // Handle line folding (lines starting with space/tab are continuations)
    for (const raw of block.split(/\r?\n/)) {
      if (raw.startsWith(' ') || raw.startsWith('\t')) {
        if (lines.length > 0) lines[lines.length - 1] += raw.slice(1);
      } else {
        lines.push(raw);
      }
    }

    let uid = '', summary = '', location = '';
    let dtStart = '', dtEnd = '';
    let startAllDay = false, endAllDay = false;

    for (const line of lines) {
      if (line.startsWith('UID:')) uid = line.slice(4).trim();
      if (line.startsWith('SUMMARY:')) summary = line.slice(8).trim();
      if (line.startsWith('LOCATION:')) location = line.slice(9).trim();
      if (line.startsWith('DTSTART')) {
        const val = line.split(':').slice(1).join(':').trim();
        const parsed = parseICalDate(val);
        dtStart = parsed.dateTime;
        startAllDay = parsed.allDay;
      }
      if (line.startsWith('DTEND')) {
        const val = line.split(':').slice(1).join(':').trim();
        const parsed = parseICalDate(val);
        dtEnd = parsed.dateTime;
        endAllDay = parsed.allDay;
      }
    }

    if (!dtStart) continue;

    // Filter by date
    const eventDate = dtStart.slice(0, 10);
    if (startAllDay) {
      // For all-day events, check if filterDate falls within [start, end)
      const endDate = dtEnd ? dtEnd.slice(0, 10) : eventDate;
      if (filterDate < eventDate || filterDate >= endDate) continue;
    } else {
      if (eventDate !== filterDate) continue;
    }

    events.push({
      id: uid || `event-${i}`,
      summary: summary || '(ללא כותרת)',
      start: dtStart,
      end: dtEnd || dtStart,
      location: location || null,
      allDay: startAllDay,
    });
  }

  // Sort by start time
  events.sort((a, b) => a.start.localeCompare(b.start));
  return events;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
    if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID not configured');

    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Fetch public iCal feed - no API key needed!
    const icalUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`;
    
    console.log(`Fetching calendar: ${icalUrl}`);
    
    const res = await fetch(icalUrl);
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Calendar fetch error [${res.status}]: ${errBody.slice(0, 200)}`);
    }

    const icalText = await res.text();
    const events = parseICal(icalText, dateParam);

    return new Response(JSON.stringify({ events }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Google Calendar error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
