import express, { Router, Request, Response } from 'express';
import identityService from '../services/identityService';
import { IdentifyRequest, IdentifyResponse } from '../types';
import logger from '../utils/logger';

const router: Router = express.Router();

router.post('/identify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, phoneNumber } = req.body as IdentifyRequest;

    logger.info('Identify request received', { email, phoneNumber });

    if (!email && !phoneNumber) {
      res.status(400).json({
        error: 'Either email or phoneNumber must be provided',
      });
      return;
    }

    const contact = await identityService.identify({
      email,
      phoneNumber,
    });

    const response: IdentifyResponse = {
      contact,
    };

    logger.info('Identify request processed successfully', {
      primaryContactId: contact.primaryContactId,
    });

    res.status(200).json(response);
  } catch (error) {
    logger.error('Error in identify endpoint', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

router.get('/health', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default router;
