import { google, calendar_v3 } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { CalendarEvent, CalendarProvider, CalendarEventStatus } from '@shared/schema';

export interface CalendarEventInput {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
  attendees?: { email: string; name?: string }[];
  reminders?: { minutes: number }[];
  recurrenceRule?: string;
  calendarId?: string;
}

export interface CalendarEventResult {
  success: boolean;
  event?: {
    id: string;
    providerEventId: string;
    htmlLink?: string;
  };
  error?: string;
}

export interface FreeBusyResult {
  busy: { start: Date; end: Date }[];
  free: { start: Date; end: Date }[];
}

export interface CalendarListResult {
  calendars: {
    id: string;
    summary: string;
    primary: boolean;
    accessRole: string;
  }[];
}

export interface SyncResult {
  events: Partial<CalendarEvent>[];
  nextSyncToken?: string;
  deleted: string[];
}

let googleCalendarConnectionSettings: any;
let outlookCalendarConnectionSettings: any;

async function getGoogleCalendarAccessToken(): Promise<string> {
  if (googleCalendarConnectionSettings && googleCalendarConnectionSettings.settings.expires_at && 
      new Date(googleCalendarConnectionSettings.settings.expires_at).getTime() > Date.now()) {
    return googleCalendarConnectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Google Calendar connector not available');
  }

  googleCalendarConnectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-mail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = googleCalendarConnectionSettings?.settings?.access_token || 
                      googleCalendarConnectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!googleCalendarConnectionSettings || !accessToken) {
    throw new Error('Google Calendar not connected');
  }
  return accessToken;
}

async function getOutlookCalendarAccessToken(): Promise<string> {
  if (outlookCalendarConnectionSettings && outlookCalendarConnectionSettings.settings.expires_at && 
      new Date(outlookCalendarConnectionSettings.settings.expires_at).getTime() > Date.now()) {
    return outlookCalendarConnectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken || !hostname) {
    throw new Error('Outlook Calendar connector not available');
  }

  outlookCalendarConnectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=outlook',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = outlookCalendarConnectionSettings?.settings?.access_token || 
                      outlookCalendarConnectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!outlookCalendarConnectionSettings || !accessToken) {
    throw new Error('Outlook Calendar not connected');
  }
  return accessToken;
}

export function isGoogleCalendarAvailable(): boolean {
  return !!(process.env.REPLIT_CONNECTORS_HOSTNAME && 
           (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL));
}

export function isOutlookCalendarAvailable(): boolean {
  return !!(process.env.REPLIT_CONNECTORS_HOSTNAME && 
           (process.env.REPL_IDENTITY || process.env.WEB_REPL_RENEWAL));
}

async function getGoogleCalendarClient(): Promise<calendar_v3.Calendar> {
  const accessToken = await getGoogleCalendarAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

async function getOutlookClient(): Promise<Client> {
  const accessToken = await getOutlookCalendarAccessToken();
  return Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => accessToken
    }
  });
}

export async function listGoogleCalendars(): Promise<CalendarListResult> {
  try {
    const calendar = await getGoogleCalendarClient();
    const response = await calendar.calendarList.list();
    
    return {
      calendars: (response.data.items || []).map(cal => ({
        id: cal.id || '',
        summary: cal.summary || 'Untitled',
        primary: cal.primary || false,
        accessRole: cal.accessRole || 'reader'
      }))
    };
  } catch (error: any) {
    console.error('[Google Calendar] List calendars failed:', error);
    throw new Error(`Failed to list calendars: ${error.message}`);
  }
}

export async function listOutlookCalendars(): Promise<CalendarListResult> {
  try {
    const client = await getOutlookClient();
    const response = await client.api('/me/calendars').get();
    
    return {
      calendars: (response.value || []).map((cal: any) => ({
        id: cal.id,
        summary: cal.name || 'Untitled',
        primary: cal.isDefaultCalendar || false,
        accessRole: cal.canEdit ? 'writer' : 'reader'
      }))
    };
  } catch (error: any) {
    console.error('[Outlook Calendar] List calendars failed:', error);
    throw new Error(`Failed to list calendars: ${error.message}`);
  }
}

export async function createGoogleEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
  try {
    const calendar = await getGoogleCalendarClient();
    const calendarId = input.calendarId || 'primary';
    
    const event: calendar_v3.Schema$Event = {
      summary: input.title,
      description: input.description,
      location: input.location,
      start: input.allDay 
        ? { date: input.startTime.toISOString().split('T')[0] }
        : { dateTime: input.startTime.toISOString() },
      end: input.allDay 
        ? { date: input.endTime.toISOString().split('T')[0] }
        : { dateTime: input.endTime.toISOString() },
      attendees: input.attendees?.map(a => ({ email: a.email, displayName: a.name })),
      reminders: input.reminders ? {
        useDefault: false,
        overrides: input.reminders.map(r => ({ method: 'popup', minutes: r.minutes }))
      } : undefined,
      recurrence: input.recurrenceRule ? [input.recurrenceRule] : undefined,
    };

    const response = await calendar.events.insert({ calendarId, requestBody: event });
    
    return {
      success: true,
      event: {
        id: response.data.id || '',
        providerEventId: response.data.id || '',
        htmlLink: response.data.htmlLink || undefined
      }
    };
  } catch (error: any) {
    console.error('[Google Calendar] Create event failed:', error);
    return { success: false, error: error.message };
  }
}

export async function createOutlookEvent(input: CalendarEventInput): Promise<CalendarEventResult> {
  try {
    const client = await getOutlookClient();
    const calendarId = input.calendarId || 'calendar';
    
    const event = {
      subject: input.title,
      body: input.description ? { contentType: 'text', content: input.description } : undefined,
      location: input.location ? { displayName: input.location } : undefined,
      start: {
        dateTime: input.startTime.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: input.endTime.toISOString(),
        timeZone: 'UTC'
      },
      isAllDay: input.allDay || false,
      attendees: input.attendees?.map(a => ({
        emailAddress: { address: a.email, name: a.name },
        type: 'required'
      })),
      recurrence: input.recurrenceRule ? parseRecurrenceForOutlook(input.recurrenceRule) : undefined
    };

    const response = await client.api(`/me/calendars/${calendarId}/events`).post(event);
    
    return {
      success: true,
      event: {
        id: response.id,
        providerEventId: response.id,
        htmlLink: response.webLink
      }
    };
  } catch (error: any) {
    console.error('[Outlook Calendar] Create event failed:', error);
    return { success: false, error: error.message };
  }
}

export async function updateGoogleEvent(eventId: string, input: Partial<CalendarEventInput>, calendarId = 'primary'): Promise<CalendarEventResult> {
  try {
    const calendar = await getGoogleCalendarClient();
    
    const event: calendar_v3.Schema$Event = {};
    if (input.title) event.summary = input.title;
    if (input.description !== undefined) event.description = input.description;
    if (input.location !== undefined) event.location = input.location;
    if (input.startTime) {
      event.start = input.allDay 
        ? { date: input.startTime.toISOString().split('T')[0] }
        : { dateTime: input.startTime.toISOString() };
    }
    if (input.endTime) {
      event.end = input.allDay 
        ? { date: input.endTime.toISOString().split('T')[0] }
        : { dateTime: input.endTime.toISOString() };
    }
    if (input.attendees) {
      event.attendees = input.attendees.map(a => ({ email: a.email, displayName: a.name }));
    }

    const response = await calendar.events.patch({ calendarId, eventId, requestBody: event });
    
    return {
      success: true,
      event: {
        id: response.data.id || '',
        providerEventId: response.data.id || '',
        htmlLink: response.data.htmlLink || undefined
      }
    };
  } catch (error: any) {
    console.error('[Google Calendar] Update event failed:', error);
    return { success: false, error: error.message };
  }
}

export async function updateOutlookEvent(eventId: string, input: Partial<CalendarEventInput>, calendarId = 'calendar'): Promise<CalendarEventResult> {
  try {
    const client = await getOutlookClient();
    
    const event: any = {};
    if (input.title) event.subject = input.title;
    if (input.description !== undefined) event.body = { contentType: 'text', content: input.description };
    if (input.location !== undefined) event.location = { displayName: input.location };
    if (input.startTime) event.start = { dateTime: input.startTime.toISOString(), timeZone: 'UTC' };
    if (input.endTime) event.end = { dateTime: input.endTime.toISOString(), timeZone: 'UTC' };
    if (input.allDay !== undefined) event.isAllDay = input.allDay;

    const response = await client.api(`/me/calendars/${calendarId}/events/${eventId}`).patch(event);
    
    return {
      success: true,
      event: {
        id: response.id,
        providerEventId: response.id,
        htmlLink: response.webLink
      }
    };
  } catch (error: any) {
    console.error('[Outlook Calendar] Update event failed:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteGoogleEvent(eventId: string, calendarId = 'primary'): Promise<{ success: boolean; error?: string }> {
  try {
    const calendar = await getGoogleCalendarClient();
    await calendar.events.delete({ calendarId, eventId });
    return { success: true };
  } catch (error: any) {
    console.error('[Google Calendar] Delete event failed:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteOutlookEvent(eventId: string, calendarId = 'calendar'): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getOutlookClient();
    await client.api(`/me/calendars/${calendarId}/events/${eventId}`).delete();
    return { success: true };
  } catch (error: any) {
    console.error('[Outlook Calendar] Delete event failed:', error);
    return { success: false, error: error.message };
  }
}

export async function getGoogleFreeBusy(startTime: Date, endTime: Date, calendarIds: string[] = ['primary']): Promise<FreeBusyResult> {
  try {
    const calendar = await getGoogleCalendarClient();
    
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: calendarIds.map(id => ({ id }))
      }
    });

    const busy: { start: Date; end: Date }[] = [];
    for (const calId of calendarIds) {
      const calBusy = response.data.calendars?.[calId]?.busy || [];
      for (const period of calBusy) {
        if (period.start && period.end) {
          busy.push({ start: new Date(period.start), end: new Date(period.end) });
        }
      }
    }

    return { busy, free: [] };
  } catch (error: any) {
    console.error('[Google Calendar] Free/busy query failed:', error);
    throw new Error(`Failed to get free/busy: ${error.message}`);
  }
}

export async function getOutlookFreeBusy(startTime: Date, endTime: Date, email?: string): Promise<FreeBusyResult> {
  try {
    const client = await getOutlookClient();
    
    const response = await client.api('/me/calendar/getSchedule').post({
      schedules: [email || 'me'],
      startTime: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
      endTime: { dateTime: endTime.toISOString(), timeZone: 'UTC' },
      availabilityViewInterval: 30
    });

    const busy: { start: Date; end: Date }[] = [];
    for (const schedule of response.value || []) {
      for (const item of schedule.scheduleItems || []) {
        if (item.status !== 'free') {
          busy.push({
            start: new Date(item.start.dateTime),
            end: new Date(item.end.dateTime)
          });
        }
      }
    }

    return { busy, free: [] };
  } catch (error: any) {
    console.error('[Outlook Calendar] Free/busy query failed:', error);
    throw new Error(`Failed to get free/busy: ${error.message}`);
  }
}

export async function syncGoogleCalendar(calendarId = 'primary', syncToken?: string): Promise<SyncResult> {
  try {
    const calendar = await getGoogleCalendarClient();
    
    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId,
      singleEvents: true,
      showDeleted: true,
      maxResults: 250
    };

    if (syncToken) {
      params.syncToken = syncToken;
    } else {
      params.timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      params.timeMax = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    }

    const response = await calendar.events.list(params);
    const events: Partial<CalendarEvent>[] = [];
    const deleted: string[] = [];

    for (const item of response.data.items || []) {
      if (item.status === 'cancelled') {
        if (item.id) deleted.push(item.id);
        continue;
      }

      const startDate = item.start?.dateTime || item.start?.date;
      const endDate = item.end?.dateTime || item.end?.date;
      if (!startDate || !endDate) continue;

      events.push({
        provider: 'google',
        providerEventId: item.id || undefined,
        calendarId,
        title: item.summary || 'Untitled',
        description: item.description || undefined,
        location: item.location || undefined,
        startTime: new Date(startDate),
        endTime: new Date(endDate),
        allDay: !!item.start?.date,
        recurrenceRule: item.recurrence?.[0] || undefined,
        status: (item.status as CalendarEventStatus) || 'confirmed',
        transparency: item.transparency || 'opaque',
        attendees: item.attendees ? item.attendees.map(a => ({
          email: a.email || '',
          name: a.displayName || undefined,
          status: a.responseStatus || undefined
        })) : undefined,
      });
    }

    return {
      events,
      nextSyncToken: response.data.nextSyncToken || undefined,
      deleted
    };
  } catch (error: any) {
    if (error.code === 410) {
      return syncGoogleCalendar(calendarId, undefined);
    }
    console.error('[Google Calendar] Sync failed:', error);
    throw new Error(`Failed to sync calendar: ${error.message}`);
  }
}

export async function syncOutlookCalendar(calendarId = 'calendar', deltaLink?: string): Promise<SyncResult> {
  try {
    const client = await getOutlookClient();
    
    let url = deltaLink || `/me/calendars/${calendarId}/events/delta`;
    const events: Partial<CalendarEvent>[] = [];
    const deleted: string[] = [];
    let nextLink: string | undefined;
    let newDeltaLink: string | undefined;

    do {
      const response = await client.api(url).get();
      
      for (const item of response.value || []) {
        if (item['@removed']) {
          deleted.push(item.id);
          continue;
        }

        events.push({
          provider: 'microsoft',
          providerEventId: item.id,
          calendarId,
          title: item.subject || 'Untitled',
          description: item.body?.content || undefined,
          location: item.location?.displayName || undefined,
          startTime: new Date(item.start.dateTime),
          endTime: new Date(item.end.dateTime),
          allDay: item.isAllDay || false,
          status: item.isCancelled ? 'cancelled' : 'confirmed',
          attendees: item.attendees ? item.attendees.map((a: any) => ({
            email: a.emailAddress.address || '',
            name: a.emailAddress.name,
            status: a.status?.response
          })) : undefined,
        });
      }

      nextLink = response['@odata.nextLink'];
      newDeltaLink = response['@odata.deltaLink'];
      url = nextLink || '';
    } while (nextLink);

    return {
      events,
      nextSyncToken: newDeltaLink,
      deleted
    };
  } catch (error: any) {
    if (error.statusCode === 410) {
      return syncOutlookCalendar(calendarId, undefined);
    }
    console.error('[Outlook Calendar] Sync failed:', error);
    throw new Error(`Failed to sync calendar: ${error.message}`);
  }
}

function parseRecurrenceForOutlook(rrule: string): any | undefined {
  const match = rrule.match(/RRULE:FREQ=(\w+)/);
  if (!match) return undefined;

  const freq = match[1].toLowerCase();
  const patternType = freq === 'daily' ? 'daily' 
    : freq === 'weekly' ? 'weekly'
    : freq === 'monthly' ? 'absoluteMonthly'
    : freq === 'yearly' ? 'absoluteYearly'
    : undefined;

  if (!patternType) return undefined;

  return {
    pattern: {
      type: patternType,
      interval: 1
    },
    range: {
      type: 'noEnd',
      startDate: new Date().toISOString().split('T')[0]
    }
  };
}

export async function getGoogleEvents(calendarId = 'primary', startTime: Date, endTime: Date): Promise<Partial<CalendarEvent>[]> {
  try {
    const calendar = await getGoogleCalendarClient();
    
    const response = await calendar.events.list({
      calendarId,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250
    });

    const events: Partial<CalendarEvent>[] = [];
    for (const item of response.data.items || []) {
      const startDate = item.start?.dateTime || item.start?.date;
      const endDate = item.end?.dateTime || item.end?.date;
      if (!startDate || !endDate) continue;

      events.push({
        provider: 'google',
        providerEventId: item.id || undefined,
        calendarId,
        title: item.summary || 'Untitled',
        description: item.description || undefined,
        location: item.location || undefined,
        startTime: new Date(startDate),
        endTime: new Date(endDate),
        allDay: !!item.start?.date,
        status: (item.status as CalendarEventStatus) || 'confirmed',
      });
    }

    return events;
  } catch (error: any) {
    console.error('[Google Calendar] Get events failed:', error);
    throw new Error(`Failed to get events: ${error.message}`);
  }
}

export async function getOutlookEvents(calendarId = 'calendar', startTime: Date, endTime: Date): Promise<Partial<CalendarEvent>[]> {
  try {
    const client = await getOutlookClient();
    
    const response = await client.api(`/me/calendars/${calendarId}/calendarView`)
      .query({
        startDateTime: startTime.toISOString(),
        endDateTime: endTime.toISOString()
      })
      .top(250)
      .get();

    const events: Partial<CalendarEvent>[] = [];
    for (const item of response.value || []) {
      events.push({
        provider: 'microsoft',
        providerEventId: item.id,
        calendarId,
        title: item.subject || 'Untitled',
        description: item.body?.content || undefined,
        location: item.location?.displayName || undefined,
        startTime: new Date(item.start.dateTime),
        endTime: new Date(item.end.dateTime),
        allDay: item.isAllDay || false,
        status: item.isCancelled ? 'cancelled' : 'confirmed',
      });
    }

    return events;
  } catch (error: any) {
    console.error('[Outlook Calendar] Get events failed:', error);
    throw new Error(`Failed to get events: ${error.message}`);
  }
}
