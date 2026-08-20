import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@e-ams/db';

const router = Router();

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().min(3),
  message: z.string().min(10),
});

router.post('/', async (req, res, next) => {
  try {
    const data = schema.parse(req.body);
    const inquiry = await prisma.contactInquiry.create({ data });
    res.status(201).json({ id: inquiry.id, message: 'Message received. We typically reply within one business day.' });
  } catch (err) {
    next(err);
  }
});

export default router;