import express from 'express';
import cors from 'cors';
import activosRouter from './routes/activos';
import transaccionesRouter from './routes/transacciones';
import controlRouter from './routes/control';
import dashboardRouter from './routes/dashboard';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OPERATIVO', sistema: 'BANCO_CENTRAL_ZIROK', timestamp: new Date().toISOString() });
});

app.use('/api/activos', activosRouter);
app.use('/api/transacciones', transaccionesRouter);
app.use('/api/control', controlRouter);
app.use('/api/dashboard', dashboardRouter);

app.listen(PORT, () => {
  console.log(`[ZIRCOIN] Servidor operativo en puerto ${PORT}`);
});

export default app;
