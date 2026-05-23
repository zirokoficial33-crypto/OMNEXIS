import { Request, Response } from 'express';
import { CuentasService } from '../services/cuentas.service';

export const CuentasController = {

  listar: async (_req: Request, res: Response) => {
    const cuentas = await CuentasService.listar();
    res.json(cuentas);
  },

  stats: async (_req: Request, res: Response) => {
    const stats = await CuentasService.stats();
    res.json(stats);
  },

  get: async (req: Request, res: Response) => {
    const cuenta = await CuentasService.get(Number(req.params.id));
    res.json(cuenta);
  },

  operaciones: async (req: Request, res: Response) => {
    const ops = await CuentasService.operaciones(Number(req.params.id));
    res.json(ops);
  },

  crear: async (req: Request, res: Response) => {
    const { titular, tipo, saldoInicial } = req.body;
    const cuenta = await CuentasService.crear(titular, tipo, saldoInicial ?? 0);
    res.status(201).json(cuenta);
  },

  depositar: async (req: Request, res: Response) => {
    const { monto, descripcion } = req.body;
    const result = await CuentasService.depositar(Number(req.params.id), monto, descripcion);
    res.json(result);
  },

  retirar: async (req: Request, res: Response) => {
    const { monto, descripcion } = req.body;
    const result = await CuentasService.retirar(Number(req.params.id), monto, descripcion);
    res.json(result);
  },

  transferir: async (req: Request, res: Response) => {
    const { numeroCuentaOrigen, numeroCuentaDestino, monto, descripcion } = req.body;
    const result = await CuentasService.transferir(numeroCuentaOrigen, numeroCuentaDestino, monto, descripcion);
    res.json(result);
  },

  cambiarEstado: async (req: Request, res: Response) => {
    const cuenta = await CuentasService.cambiarEstado(Number(req.params.id), req.body.estado);
    res.json(cuenta);
  },
};
