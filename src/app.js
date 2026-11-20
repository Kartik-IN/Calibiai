import cors from 'cors';
import express from 'express';
import authRoutes from './routes/auth.routes.js';
import dsaProblemRoutes from './routes/dsa-problem.routes.js';
import dsaProgressRoutes from './routes/dsa-progress.routes.js';
import dsaTopicRoutes from './routes/dsa-topic.routes.js';
import healthRoutes from './routes/health.routes.js';
import systemRoutes from './routes/system.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'CalibiAI DSA Backend is running',
  });
});

app.use('/api/health', healthRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dsa/problems', dsaProblemRoutes);
app.use('/api/dsa/topics', dsaTopicRoutes);
app.use('/api/dsa/progress', dsaProgressRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

export default app;
