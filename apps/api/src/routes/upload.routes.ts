import { Router } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.post('/signature', requireAuth, async (_req: AuthedRequest, res, next) => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    if (!cloudName || !apiKey || !process.env.CLOUDINARY_API_SECRET) {
      throw new ApiError(503, 'Image uploads are not configured. Add Cloudinary credentials.');
    }
    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'e-ams';
    const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, process.env.CLOUDINARY_API_SECRET);
    res.json({ timestamp, signature, folder, cloudName, apiKey });
  } catch (err) {
    next(err);
  }
});

export default router;