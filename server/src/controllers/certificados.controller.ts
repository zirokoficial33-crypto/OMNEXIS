import { Request, Response } from 'express';
import { CertificadosService } from '../services/certificados.service';

export const CertificadosController = {

  listar: async (_req: Request, res: Response) => {
    const certs = await CertificadosService.listar();
    res.json(certs);
  },

  stats: async (_req: Request, res: Response) => {
    const stats = await CertificadosService.stats();
    res.json(stats);
  },

  movimientos: async (req: Request, res: Response) => {
    const movs = await CertificadosService.movimientos(Number(req.params.id));
    res.json(movs);
  },

  emitir: async (req: Request, res: Response) => {
    const { denominacion, clase, descripcion, diasVigencia, idActivoRespaldo, idCuentaTenedor } = req.body;
    const cert = await CertificadosService.emitir(
      denominacion,
      clase ?? 'SOBERANO',
      descripcion,
      diasVigencia,
      idActivoRespaldo,
      idCuentaTenedor,
    );
    res.status(201).json(cert);
  },

  transferir: async (req: Request, res: Response) => {
    const { idCuentaDestino, notas } = req.body;
    const result = await CertificadosService.transferir(Number(req.params.id), idCuentaDestino, notas);
    res.json(result);
  },

  redimir: async (req: Request, res: Response) => {
    const { idCuentaCobro, notas } = req.body;
    const result = await CertificadosService.redimir(Number(req.params.id), idCuentaCobro, notas);
    res.json(result);
  },
};
