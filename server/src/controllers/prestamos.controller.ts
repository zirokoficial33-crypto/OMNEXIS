import { Request, Response } from 'express';
import { PrestamosService } from '../services/prestamos.service';

export const PrestamosController = {

  listar: async (_req: Request, res: Response) => {
    const prestamos = await PrestamosService.listar();
    res.json(prestamos);
  },

  stats: async (_req: Request, res: Response) => {
    const stats = await PrestamosService.stats();
    res.json(stats);
  },

  pagos: async (req: Request, res: Response) => {
    const pagos = await PrestamosService.pagos(Number(req.params.id));
    res.json(pagos);
  },

  crear: async (req: Request, res: Response) => {
    const { idCuentaDeudor, montoPrincipal, plazo, proposito } = req.body;
    const prestamo = await PrestamosService.crear(idCuentaDeudor, montoPrincipal, plazo, proposito);
    res.status(201).json(prestamo);
  },

  pagar: async (req: Request, res: Response) => {
    const { monto, idCuentaPagadora } = req.body;
    const result = await PrestamosService.pagar(Number(req.params.id), monto, idCuentaPagadora);
    res.json(result);
  },
};
