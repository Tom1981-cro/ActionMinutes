import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { requireAuth } from './jwt';
import { z } from 'zod';
import {
  createGoogleEvent,
  createOutlookEvent,
  updateGoogleEvent,
  updateOutlookEvent,
  deleteGoogleEvent,
  deleteOutlookEvent,
  getGoogleFreeBusy,
  getOutlookFreeBusy,
  syncGoogleCalendar,
  syncOutlookCalendar,
  listGoogleCalendars,
  listOutlookCalendars,
  getGoogleEvents,
  getOutlookEvents,
  isGoogleCalendarAvailable,
  isOutlookCalendarAvailable,
  type CalendarEventInput
} from './calendar-providers';
import { InsertCalendarEvent } from '@shared/schema';

const router = Router();

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().transform(s => new Date(s)),
  endTime: z.string().transform(s => new Date(s)),
  allDay: z.boolean().optional().default(false),
  attendees: z.array(z.object({
    email: z.string().email(),
    name: z.string().optional()
  })).optional(),
  reminders: z.array(z.object({ method: z.string().default('popup'), minutes: z.number() })).optional(),
  recurrenceRule: z.string().optional(),
  provider: z.enum(['google', 'microsoft', 'local']).optional().default('local'),
  calendarId: z.string().optional(),
  meetingId: z.string().optional(),
  color: z.string().optional()
});

const updateEventSchema = createEventSchema.partial().extend({
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional()
});

router.get('/events', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const startTime = req.query.start ? new Date(req.query.start as string) : undefined;
    const endTime = req.query.end ? new Date(req.query.end as string) : undefined;
    
    const events = await storage.getCalendarEvents(userId, startTime, endTime);
    res.json({ success: true, events });
  } catch (error: any) {
    console.error('[Calendar] Get events failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/events/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const event = await storage.getCalendarEvent(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    if (event.userId !== req.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    res.json({ success: true, event });
  } catch (error: any) {
    console.error('[Calendar] Get event failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/events', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.message });
    }
    
    const data = parsed.data;
    const provider = data.provider;
    
    let providerEventId: string | undefined;
    let htmlLink: string | undefined;
    let connectionId: string | undefined;
    
    if (provider !== 'local') {
      const connection = await storage.getOAuthConnection(userId, provider);
      if (!connection) {
        return res.status(403).json({ 
          success: false, 
          error: `No ${provider} calendar connection found. Please connect your calendar in Settings.` 
        });
      }
      connectionId = connection.id;
      
      if (provider === 'google' && isGoogleCalendarAvailable()) {
        const result = await createGoogleEvent({
          title: data.title,
          description: data.description,
          location: data.location,
          startTime: data.startTime,
          endTime: data.endTime,
          allDay: data.allDay,
          attendees: data.attendees,
          reminders: data.reminders,
          recurrenceRule: data.recurrenceRule,
          calendarId: data.calendarId
        });
        if (!result.success) {
          return res.status(500).json({ success: false, error: result.error });
        }
        providerEventId = result.event?.providerEventId;
        htmlLink = result.event?.htmlLink;
      } else if (provider === 'microsoft' && isOutlookCalendarAvailable()) {
        const result = await createOutlookEvent({
          title: data.title,
          description: data.description,
          location: data.location,
          startTime: data.startTime,
          endTime: data.endTime,
          allDay: data.allDay,
          attendees: data.attendees,
          reminders: data.reminders,
          recurrenceRule: data.recurrenceRule,
          calendarId: data.calendarId
        });
        if (!result.success) {
          return res.status(500).json({ success: false, error: result.error });
        }
        providerEventId = result.event?.providerEventId;
        htmlLink = result.event?.htmlLink;
      }
    }
    
    const eventData: InsertCalendarEvent = {
      userId,
      connectionId,
      provider,
      providerEventId,
      calendarId: data.calendarId,
      title: data.title,
      description: data.description,
      location: data.location,
      startTime: data.startTime,
      endTime: data.endTime,
      allDay: data.allDay,
      recurrenceRule: data.recurrenceRule,
      attendees: data.attendees,
      reminders: data.reminders,
      meetingId: data.meetingId,
      color: data.color
    };
    
    const event = await storage.createCalendarEvent(eventData);
    res.json({ success: true, event, htmlLink });
  } catch (error: any) {
    console.error('[Calendar] Create event failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/events/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await storage.getCalendarEvent(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (existing.isReadOnly) {
      return res.status(403).json({ success: false, error: 'Event is read-only' });
    }
    
    const parsed = updateEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.message });
    }
    
    const data = parsed.data;
    
    if (existing.providerEventId && existing.provider !== 'local') {
      const input: Partial<CalendarEventInput> = {
        title: data.title,
        description: data.description,
        location: data.location,
        startTime: data.startTime,
        endTime: data.endTime,
        allDay: data.allDay,
        attendees: data.attendees
      };
      
      if (existing.provider === 'google') {
        const result = await updateGoogleEvent(existing.providerEventId, input, existing.calendarId || 'primary');
        if (!result.success) {
          return res.status(500).json({ success: false, error: result.error });
        }
      } else if (existing.provider === 'microsoft') {
        const result = await updateOutlookEvent(existing.providerEventId, input, existing.calendarId || 'calendar');
        if (!result.success) {
          return res.status(500).json({ success: false, error: result.error });
        }
      }
    }
    
    const event = await storage.updateCalendarEvent(req.params.id, {
      title: data.title,
      description: data.description,
      location: data.location,
      startTime: data.startTime,
      endTime: data.endTime,
      allDay: data.allDay,
      attendees: data.attendees,
      reminders: data.reminders,
      recurrenceRule: data.recurrenceRule,
      status: data.status,
      color: data.color
    });
    
    res.json({ success: true, event });
  } catch (error: any) {
    console.error('[Calendar] Update event failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/events/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const existing = await storage.getCalendarEvent(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    if (existing.userId !== req.userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (existing.isReadOnly) {
      return res.status(403).json({ success: false, error: 'Event is read-only' });
    }
    
    if (existing.providerEventId && existing.provider !== 'local') {
      if (existing.provider === 'google') {
        await deleteGoogleEvent(existing.providerEventId, existing.calendarId || 'primary');
      } else if (existing.provider === 'microsoft') {
        await deleteOutlookEvent(existing.providerEventId, existing.calendarId || 'calendar');
      }
    }
    
    await storage.deleteCalendarEvent(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Calendar] Delete event failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/calendars', requireAuth, async (req: Request, res: Response) => {
  try {
    const provider = req.query.provider as string;
    
    const calendars: any[] = [];
    
    if ((!provider || provider === 'google') && isGoogleCalendarAvailable()) {
      try {
        const result = await listGoogleCalendars();
        calendars.push(...result.calendars.map(c => ({ ...c, provider: 'google' })));
      } catch (e) {
        console.log('[Calendar] Google calendars not available:', e);
      }
    }
    
    if ((!provider || provider === 'microsoft') && isOutlookCalendarAvailable()) {
      try {
        const result = await listOutlookCalendars();
        calendars.push(...result.calendars.map(c => ({ ...c, provider: 'microsoft' })));
      } catch (e) {
        console.log('[Calendar] Outlook calendars not available:', e);
      }
    }
    
    calendars.push({ id: 'local', summary: 'Local Calendar', primary: true, accessRole: 'owner', provider: 'local' });
    
    res.json({ success: true, calendars });
  } catch (error: any) {
    console.error('[Calendar] List calendars failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/free-busy', requireAuth, async (req: Request, res: Response) => {
  try {
    const startTime = new Date(req.query.start as string);
    const endTime = new Date(req.query.end as string);
    const provider = req.query.provider as string;
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date range' });
    }
    
    let busy: { start: Date; end: Date }[] = [];
    
    if ((!provider || provider === 'google') && isGoogleCalendarAvailable()) {
      try {
        const result = await getGoogleFreeBusy(startTime, endTime);
        busy.push(...result.busy);
      } catch (e) {
        console.log('[Calendar] Google free/busy not available');
      }
    }
    
    if ((!provider || provider === 'microsoft') && isOutlookCalendarAvailable()) {
      try {
        const result = await getOutlookFreeBusy(startTime, endTime);
        busy.push(...result.busy);
      } catch (e) {
        console.log('[Calendar] Outlook free/busy not available');
      }
    }
    
    const localEvents = await storage.getCalendarEvents(req.userId!, startTime, endTime);
    for (const event of localEvents) {
      if (event.transparency !== 'transparent' && event.status !== 'cancelled') {
        busy.push({ start: event.startTime, end: event.endTime });
      }
    }
    
    busy.sort((a, b) => a.start.getTime() - b.start.getTime());
    
    res.json({ success: true, busy });
  } catch (error: any) {
    console.error('[Calendar] Free/busy failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const provider = req.body.provider as string;
    const calendarId = req.body.calendarId as string;
    
    if (!provider || !['google', 'microsoft'].includes(provider)) {
      return res.status(400).json({ success: false, error: 'Invalid provider' });
    }
    
    const connection = await storage.getOAuthConnection(userId, provider);
    if (!connection) {
      return res.status(400).json({ success: false, error: 'No connection found for provider' });
    }
    
    let syncResult;
    if (provider === 'google') {
      syncResult = await syncGoogleCalendar(calendarId || 'primary', connection.calendarSyncToken || undefined);
    } else {
      syncResult = await syncOutlookCalendar(calendarId || 'calendar', connection.calendarSyncToken || undefined);
    }
    
    if (syncResult.deleted.length > 0) {
      await storage.deleteCalendarEventsByProvider(connection.id, syncResult.deleted);
    }
    
    const eventsToUpsert: InsertCalendarEvent[] = syncResult.events.map(e => ({
      userId,
      connectionId: connection.id,
      provider: e.provider!,
      providerEventId: e.providerEventId,
      calendarId: e.calendarId,
      title: e.title!,
      description: e.description,
      location: e.location,
      startTime: e.startTime!,
      endTime: e.endTime!,
      allDay: e.allDay || false,
      recurrenceRule: e.recurrenceRule,
      status: e.status || 'confirmed',
      transparency: e.transparency,
      attendees: e.attendees,
      isReadOnly: true,
      syncedAt: new Date()
    }));
    
    const upsertedEvents = await storage.upsertCalendarEvents(eventsToUpsert);
    
    if (syncResult.nextSyncToken) {
      await storage.updateOAuthConnection(connection.id, {
        calendarSyncToken: syncResult.nextSyncToken,
        calendarId: calendarId || (provider === 'google' ? 'primary' : 'calendar'),
        lastCalendarSync: new Date()
      });
    }
    
    res.json({
      success: true,
      synced: upsertedEvents.length,
      deleted: syncResult.deleted.length
    });
  } catch (error: any) {
    console.error('[Calendar] Sync failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/webhook/google', async (req: Request, res: Response) => {
  try {
    const channelId = req.headers['x-goog-channel-id'] as string;
    const resourceState = req.headers['x-goog-resource-state'] as string;
    
    if (resourceState === 'sync') {
      return res.status(200).send();
    }
    
    console.log(`[Calendar] Google webhook: channel=${channelId}, state=${resourceState}`);
    
    res.status(200).send();
  } catch (error: any) {
    console.error('[Calendar] Google webhook failed:', error);
    res.status(500).send();
  }
});

router.post('/webhook/outlook', async (req: Request, res: Response) => {
  try {
    if (req.query.validationToken) {
      return res.status(200).send(req.query.validationToken);
    }
    
    const notifications = req.body.value || [];
    for (const notification of notifications) {
      console.log(`[Calendar] Outlook webhook: resource=${notification.resource}, change=${notification.changeType}`);
    }
    
    res.status(202).send();
  } catch (error: any) {
    console.error('[Calendar] Outlook webhook failed:', error);
    res.status(500).send();
  }
});

router.get('/providers', requireAuth, async (req: Request, res: Response) => {
  try {
    const providers = [
      { id: 'local', name: 'Local Calendar', available: true, connected: true }
    ];
    
    if (isGoogleCalendarAvailable()) {
      const connection = await storage.getOAuthConnection(req.userId!, 'google');
      providers.push({
        id: 'google',
        name: 'Google Calendar',
        available: true,
        connected: !!connection
      });
    }
    
    if (isOutlookCalendarAvailable()) {
      const connection = await storage.getOAuthConnection(req.userId!, 'microsoft');
      providers.push({
        id: 'microsoft',
        name: 'Outlook Calendar',
        available: true,
        connected: !!connection
      });
    }
    
    res.json({ success: true, providers });
  } catch (error: any) {
    console.error('[Calendar] Get providers failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
