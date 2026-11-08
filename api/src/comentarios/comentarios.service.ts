import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import type { Model } from 'mongoose';
import { Comentario, Publicacion, Usuario } from '../schemas/index.js';
import { CreateComentarioDto, LikeDto, QueryComentariosDto } from './comentarios.dto.js';

@Injectable()
export class ComentariosService {
  constructor(
    @InjectModel(Comentario.name) private readonly comentarios: Model<Comentario>,
    @InjectModel(Usuario.name) private readonly usuarios: Model<Usuario>,
    @InjectModel(Publicacion.name) private readonly publicaciones: Model<Publicacion>,
  ) {}

  async findAll(q: QueryComentariosDto) {
    const filtro: Record<string, unknown> = {};
    if (q.publicacion_id) filtro.publicacion_id = q.publicacion_id;
    if (q.usuario_id) filtro.usuario_id = q.usuario_id;
    const [data, total] = await Promise.all([
      this.comentarios.find(filtro).sort({ fecha: -1, _id: 1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
      this.comentarios.countDocuments(filtro),
    ]);
    return { data, total, page: q.page, limit: q.limit };
  }

  async create(dto: CreateComentarioDto) {
    if (!(await this.usuarios.exists({ _id: dto.usuario_id }))) {
      throw new UnprocessableEntityException(`usuario_id ${dto.usuario_id} no existe`);
    }
    if (!(await this.publicaciones.exists({ _id: dto.publicacion_id }))) {
      throw new UnprocessableEntityException(`publicacion_id ${dto.publicacion_id} no existe`);
    }
    const creado = await this.comentarios.create({ ...dto, _id: `comm_${randomUUID().slice(0, 8)}`, fecha: new Date(), likes: 0 });
    return creado.toObject();
  }

  // $inc atomico: evita perder likes si dos clientes escriben a la vez
  async like(id: string, dto: LikeDto) {
    const doc = await this.comentarios.findByIdAndUpdate(id, { $inc: { likes: dto.cantidad } }, { returnDocument: 'after' }).lean();
    if (!doc) throw new NotFoundException(`El comentario ${id} no existe`);
    return doc;
  }

  async remove(id: string) {
    const r = await this.comentarios.deleteOne({ _id: id });
    if (r.deletedCount === 0) throw new NotFoundException(`El comentario ${id} no existe`);
    return { eliminado: true, id };
  }
}
