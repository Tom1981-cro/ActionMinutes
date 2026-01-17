import { Router, Request, Response } from 'express';
import { storage } from './storage';
import { requireAuth } from './jwt';
import { encryptNoteContent, decryptNoteContent, generateSearchVector } from './crypto';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const upload = multer({
  dest: 'uploads/notes/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

const createNoteSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string(),
  isJournal: z.boolean().optional().default(false),
  visibility: z.enum(['private', 'workspace', 'public']).optional().default('private'),
  color: z.string().optional(),
  moodScore: z.number().min(1).max(5).optional(),
  moodLabel: z.string().optional(),
  promptId: z.string().optional(),
  workspaceId: z.string().optional(),
  tagIds: z.array(z.string()).optional()
});

const updateNoteSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().optional(),
  isJournal: z.boolean().optional(),
  visibility: z.enum(['private', 'workspace', 'public']).optional(),
  isPinned: z.boolean().optional(),
  color: z.string().optional(),
  moodScore: z.number().min(1).max(5).optional(),
  moodLabel: z.string().optional()
});

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional()
});

router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { search, tagId, isJournal, limit } = req.query;
    
    const notes = await storage.getNotes(userId, {
      search: search as string,
      tagId: tagId as string,
      isJournal: isJournal === 'true' ? true : isJournal === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined
    });
    
    const decryptedNotes = notes.map(note => ({
      ...note,
      content: decryptNoteContent(note.contentEncrypted, note.contentIv)
    }));
    
    res.json({ success: true, notes: decryptedNotes });
  } catch (error: any) {
    console.error('[Notes] Get notes failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/feed', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    
    const notes = await storage.getNotesFeed(userId, limit);
    
    const decryptedNotes = notes.map(note => ({
      ...note,
      content: decryptNoteContent(note.contentEncrypted, note.contentIv),
      preview: decryptNoteContent(note.contentEncrypted, note.contentIv).slice(0, 200)
    }));
    
    res.json({ success: true, notes: decryptedNotes });
  } catch (error: any) {
    console.error('[Notes] Get feed failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const query = req.query.q as string;
    
    if (!query) {
      return res.status(400).json({ success: false, error: 'Search query required' });
    }
    
    const notes = await storage.searchNotes(userId, query);
    
    const decryptedNotes = notes.map(note => ({
      ...note,
      content: decryptNoteContent(note.contentEncrypted, note.contentIv)
    }));
    
    res.json({ success: true, notes: decryptedNotes });
  } catch (error: any) {
    console.error('[Notes] Search failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/prompts/daily', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const shownPromptIds = await storage.getShownPromptsForUser(userId);
    const allPrompts = await storage.getJournalPrompts();
    
    const availablePrompts = allPrompts.filter(p => 
      p.isActive && !shownPromptIds.includes(p.id)
    );
    
    if (availablePrompts.length === 0) {
      const randomPrompt = allPrompts[Math.floor(Math.random() * allPrompts.length)];
      return res.json({ success: true, prompt: randomPrompt || null });
    }
    
    const randomIndex = Math.floor(Math.random() * availablePrompts.length);
    const prompt = availablePrompts[randomIndex];
    
    if (prompt) {
      await storage.trackPromptShown(userId, prompt.id);
    }
    
    res.json({ success: true, prompt });
  } catch (error: any) {
    console.error('[Notes] Get daily prompt failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tags', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const tags = await storage.getNoteTags(userId);
    res.json({ success: true, tags });
  } catch (error: any) {
    console.error('[Notes] Get tags failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/tags', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = createTagSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.message });
    }
    
    const tag = await storage.createNoteTag({
      userId,
      name: parsed.data.name,
      color: parsed.data.color
    });
    
    res.json({ success: true, tag });
  } catch (error: any) {
    console.error('[Notes] Create tag failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/tags/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const tag = await storage.getNoteTag(req.params.id);
    
    if (!tag) {
      return res.status(404).json({ success: false, error: 'Tag not found' });
    }
    if (tag.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    await storage.deleteNoteTag(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Notes] Delete tag failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const note = await storage.getNote(req.params.id);
    
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    if (note.userId !== userId && note.visibility === 'private') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    const tags = await storage.getNoteTagsForNote(note.id);
    const attachments = await storage.getNoteAttachments(note.id);
    const links = await storage.getNoteLinks(note.id);
    
    res.json({
      success: true,
      note: {
        ...note,
        content: decryptNoteContent(note.contentEncrypted, note.contentIv),
        tags,
        attachments,
        linkedNotes: links.map(l => ({
          id: l.toNote.id,
          title: l.toNote.title
        }))
      }
    });
  } catch (error: any) {
    console.error('[Notes] Get note failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const parsed = createNoteSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.message });
    }
    
    const { content, tagIds, ...rest } = parsed.data;
    const { encrypted, iv } = encryptNoteContent(content);
    const searchVector = generateSearchVector(rest.title + ' ' + content);
    
    const note = await storage.createNote({
      userId,
      ...rest,
      contentEncrypted: encrypted,
      contentIv: iv,
      contentPlaintext: null,
      searchVector
    });
    
    if (tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        await storage.addTagToNote(note.id, tagId);
      }
    }
    
    if (rest.promptId) {
      await storage.trackPromptResponse(userId, rest.promptId, note.id);
    }
    
    res.json({
      success: true,
      note: {
        ...note,
        content
      }
    });
  } catch (error: any) {
    console.error('[Notes] Create note failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const existing = await storage.getNote(req.params.id);
    
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    if (existing.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    const parsed = updateNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.message });
    }
    
    const updates: any = { ...parsed.data };
    
    if (parsed.data.content !== undefined) {
      const { encrypted, iv } = encryptNoteContent(parsed.data.content);
      updates.contentEncrypted = encrypted;
      updates.contentIv = iv;
      updates.searchVector = generateSearchVector(
        (parsed.data.title || existing.title) + ' ' + parsed.data.content
      );
      delete updates.content;
    }
    
    const note = await storage.updateNote(req.params.id, updates);
    
    res.json({
      success: true,
      note: note ? {
        ...note,
        content: decryptNoteContent(note.contentEncrypted, note.contentIv)
      } : null
    });
  } catch (error: any) {
    console.error('[Notes] Update note failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const note = await storage.getNote(req.params.id);
    
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    if (note.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    await storage.deleteNote(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Notes] Delete note failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/tags/:tagId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const note = await storage.getNote(req.params.id);
    
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    if (note.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    await storage.addTagToNote(req.params.id, req.params.tagId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Notes] Add tag failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id/tags/:tagId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const note = await storage.getNote(req.params.id);
    
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    if (note.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    await storage.removeTagFromNote(req.params.id, req.params.tagId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Notes] Remove tag failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/links/:targetId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const note = await storage.getNote(req.params.id);
    const targetNote = await storage.getNote(req.params.targetId);
    
    if (!note || !targetNote) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    if (note.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    const link = await storage.createNoteLink(req.params.id, req.params.targetId);
    res.json({ success: true, link });
  } catch (error: any) {
    console.error('[Notes] Create link failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id/links/:targetId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const note = await storage.getNote(req.params.id);
    
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    if (note.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    await storage.deleteNoteLink(req.params.id, req.params.targetId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Notes] Delete link failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/attachments', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const note = await storage.getNote(req.params.id);
    
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    if (note.userId !== userId && note.visibility === 'private') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    const attachments = await storage.getNoteAttachments(req.params.id);
    res.json({ success: true, attachments });
  } catch (error: any) {
    console.error('[Notes] Get attachments failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/attachments', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const note = await storage.getNote(req.params.id);
    
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    if (note.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const attachment = await storage.createNoteAttachment({
      noteId: req.params.id,
      userId,
      fileUrl: `/uploads/notes/${req.file.filename}`,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size
    });
    
    res.json({ success: true, attachment });
  } catch (error: any) {
    console.error('[Notes] Upload attachment failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id/attachments/:attachmentId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const note = await storage.getNote(req.params.id);
    
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    if (note.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    await storage.deleteNoteAttachment(req.params.attachmentId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Notes] Delete attachment failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
