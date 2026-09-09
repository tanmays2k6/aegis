import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/authRoutes.js';
import caseRoutes from './routes/caseRoutes.js';
import evidenceRoutes from './routes/evidenceRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import complianceRoutes from './routes/complianceRoutes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '30mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/compliance', complianceRoutes);

app.use(errorHandler);

// Vercel invokes the exported Express application as a serverless function.
// Locally, retain the normal long-running development server.
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Chain of Custody API running on port ${PORT}`));
}

export default app;
