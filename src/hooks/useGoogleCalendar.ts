import { useQuery } from '@tanstack/react-query';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location: string | null;
  allDay: boolean;
}

export function useGoogleCalendarEvents(date: string) {
  return useQuery({
    queryKey: ['google-calendar', date],
    queryFn: async () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?date=${date}`;
      const res = await fetch(url, {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to fetch calendar events');
      }

      const result = await res.json();
      return (result.events || []) as CalendarEvent[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
