import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import logger from './utils/logger';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

app.use((req: Request, _res: Response, next: NextFunction): void => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.use('/', routes);

app.use((req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

app.use((err: any, req: Request, res: Response, _next: NextFunction): void => {
  logger.error('Unhandled error', {
    error: err.message,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal server error',
  });
});

const startServer = async (): Promise<void> => {
  try {
    app.listen(port, () => {
      logger.info(`Server running on port ${port}`, {
        env: process.env.NODE_ENV || 'development',
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

startServer();

export default app;
