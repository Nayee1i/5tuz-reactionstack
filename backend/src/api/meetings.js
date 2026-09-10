// routes/meetings.js
import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = express.Router();

// GET /api/meetings/status
router.get('/status', async (req, res) => {
  try {
    const now = new Date();
    
    // Ищем активную встречу
    const ongoing = await prisma.meeting.findFirst({
      where: {
        startsAt: { lte: now },
        endsAt: { gte: now },
        status: 'ONGOING'
      },
      include: {
        conductor: { select: { id: true, fullName: true } },
        participant: { select: { id: true, fullName: true } }
      }
    });

    // Ищем следующую встречу
    const next = await prisma.meeting.findFirst({
      where: {
        startsAt: { gt: now },
        status: 'SCHEDULED'
      },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        title: true,
        startsAt: true,
        status: true
      }
    });

    // Считаем количество предстоящих
    const upcomingCount = await prisma.meeting.count({
      where: {
        startsAt: { gt: now },
        status: 'SCHEDULED'
      }
    });

    res.json({
      ongoing: ongoing ? {
        id: ongoing.id,
        title: ongoing.title,
        type: ongoing.type,
        format: ongoing.format,
        startsAt: ongoing.startsAt,
        endsAt: ongoing.endsAt,
        status: ongoing.status.toLowerCase(),
        participant: ongoing.participant,
        conductor: ongoing.conductor
      } : null,
      next: next ? {
        id: next.id,
        title: next.title,
        startsAt: next.startsAt,
        status: next.status.toLowerCase()
      } : null,
      upcomingCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/meetings/upcoming
router.get('/upcoming', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const now = new Date();

    const meetings = await prisma.meeting.findMany({
      where: {
        startsAt: { gte: now },
        status: { in: ['SCHEDULED', 'ONGOING'] }
      },
      orderBy: { startsAt: 'asc' },
      take: limit,
      include: {
        conductor: { select: { id: true, fullName: true } },
        participant: { select: { id: true, fullName: true } }
      }
    });

    const result = meetings.map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      type: meeting.type,
      format: meeting.format,
      startsAt: meeting.startsAt,
      endsAt: meeting.endsAt,
      status: meeting.status.toLowerCase(),
      statusLabel: meeting.status === 'ONGOING' ? 'Идёт сейчас' : 'Запланирована',
      conductor: meeting.conductor,
      participant: meeting.participant
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/meetings/history
router.get('/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const [meetings, total] = await Promise.all([
      prisma.meeting.findMany({
        where: {
          status: 'COMPLETED'
        },
        orderBy: { startsAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          conductor: { select: { id: true, fullName: true } },
          participant: { select: { id: true, fullName: true } },
          _count: {
            select: {
              skills: true,
              problems: true,
              attachments: true
            }
          }
        }
      }),
      prisma.meeting.count({
        where: { status: 'COMPLETED' }
      })
    ]);

    const items = meetings.map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      type: meeting.type,
      startsAt: meeting.startsAt,
      status: meeting.status.toLowerCase(),
      statusLabel: 'Итоги подведены',
      conductor: meeting.conductor,
      participant: meeting.participant,
      summary: meeting.summaryMarkdown?.substring(0, 100) + '...',
      confirmedSkillsCount: meeting._count.skills,
      problemsCount: meeting._count.problems,
      attachmentsCount: meeting._count.attachments
    }));

    res.json({
      page,
      pageSize,
      total,
      items
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/meetings/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const meeting = await prisma.meeting.findUnique({
      where: { id },
      include: {
        conductor: { select: { id: true, fullName: true } },
        participant: { select: { id: true, fullName: true } },
        skills: true,
        problems: true,
        attachments: true,
        links: true
      }
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json({
      id: meeting.id,
      title: meeting.title,
      startsAt: meeting.startsAt,
      endsAt: meeting.endsAt,
      conductor: meeting.conductor,
      participant: meeting.participant,
      summaryMarkdown: meeting.summaryMarkdown,
      attachments: meeting.attachments,
      links: meeting.links,
      skills: meeting.skills,
      problems: meeting.problems
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/meetings
router.post('/', async (req, res) => {
  try {
    const { participantId, type, format, startsAt, endsAt, comment } = req.body;

    const meeting = await prisma.meeting.create({
      data: {
        title: `PR 1:1 встреча`,
        type,
        format,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        comment,
        status: 'SCHEDULED',
        conductorId: req.user.id, // Предполагается, что есть middleware авторизации
        participantId
      },
      include: {
        conductor: { select: { id: true, fullName: true } },
        participant: { select: { id: true, fullName: true } }
      }
    });

    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;