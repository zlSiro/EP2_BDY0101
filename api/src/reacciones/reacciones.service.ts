import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import type { Model } from 'mongoose';
import { Publicacion, Reaccion, Usuario } from '../schemas/index.js';
import { CreateReaccionDto, QueryReaccionesDto } from './reacciones.dto.js';

@Injectable()
export class ReaccionesService {
  constructor(
    @InjectModel(Reaccion.name) private readonly reacciones: Model<Reaccion>,
    @InjectModel(Usuario.name) private readonly usuarios: Model<Usuario>,
    @InjectModel(Publicacion.name) private readonly publicaciones: Model<Publicacion>,
  ) {}

  async findAll(q: QueryReaccionesDto) {
    const filtro: Record<string, unknown> = {};
    if (q.publicacion_id) filtro.publicacion_id = q.publicacion_id;
    if (q.usuario_id) filtro.usuario_id = q.usuario_id;
    if (q.tipo_reaccion) filtro.tipo_reaccion = q.tipo_reaccion;
    const [data, total] = await Promise.all([
      this.reacciones.find(filtro).sort({ fecha: -1, _id: 1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
      this.reacciones.countDocuments(filtro),
    ]);
    return { data, total, page: q.page, limit: q.limit };
  }

  async create(dto: CreateReaccionDto) {
    if (!(await this.usuarios.exists({ _id: dto.usuario_id }))) {
      throw new UnprocessableEntityException(`usuario_id ${dto.usuario_id} no existe`);
    }
    if (!(await this.publicaciones.exists({ _id: dto.publicacion_id }))) {
      throw new UnprocessableEntityException(`publicacion_id ${dto.publicacion_id} no existe`);
    }
    // Regla de calidad (paso 5): una reaccion por usuario y publicacion
    if (await this.reacciones.exists({ usuario_id: dto.usuario_id, publicacion_id: dto.publicacion_id })) {
      throw new ConflictException('El usuario ya reacciono a esta publicacion');
    }
    const creada = await this.reacciones.create({ ...dto, _id: `react_${randomUUID().slice(0, 8)}`, fecha: new Date() });
    return creada.toObject();
  }

  async remove(id: string) {
    const r = await this.reacciones.deleteOne({ _id: id });
    if (r.deletedCount === 0) throw new NotFoundException(`La reaccion ${id} no existe`);
    return { eliminado: true, id };
  }
}
