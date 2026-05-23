import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import activosRouter from './routes/activos';
import transaccionesRouter from './routes/transacciones';
import controlRouter from './routes/control';
import dashboardRouter from './routes/dashboard';
import bancoRouter from './routes/banco';
import cuentasRouter from './routes/cuentas';
import prestamosRouter from './routes/prestamos';
import alertasRouter from './routes/alertas';
import inteligenciaRouter from './routes/inteligencia';
import certificadosRouter from './routes/certificados';
import authRouter from './routes/auth';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGIN || '*'
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones — intenta más tarde' },
});

const writeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Límite de operaciones de escritura alcanzado' },
});

app.use(globalLimiter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OPERATIVO',
    sistema: 'BANCO_CENTRAL_ZIROK',
    version: '2.0.0-blindado',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/activos', activosRouter);
app.use('/api/transacciones', transaccionesRouter);
app.use('/api/control', controlRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/banco', bancoRouter);
app.use('/api/cuentas', writeLimiter, cuentasRouter);
app.use('/api/prestamos', writeLimiter, prestamosRouter);
app.use('/api/alertas', alertasRouter);
app.use('/api/inteligencia', inteligenciaRouter);
app.use('/api/certificados', writeLimiter, certificadosRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
// Captura todo error lanzado con next(err) o dentro de asyncHandler.
// En producción nunca expone stack traces al cliente.
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[ZIRCOIN] ⚡ Servidor BLINDADO operativo en puerto ${PORT}`);
  console.log(`[ZIRCOIN] 🛡️  Helmet + Rate Limiting + Zod + JWT + ACID activos`);
  console.log(`[ZIRCOIN] 🏗️  Arquitectura: Controllers → Services → DB (Drizzle)`);
});

export default app;
