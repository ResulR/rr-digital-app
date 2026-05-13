import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler } from './middlewares/errorHandler';
import healthRoutes from './routes/health.routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/health', healthRoutes);

  app.use((_req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested resource was not found',
    });
  });

  app.use(errorHandler);

  return app;
}
