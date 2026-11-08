import { BadRequestException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import type { Connection, Model } from 'mongoose';
import { Comentario, Publicacion, Reaccion, Usuario } from '../schemas/index.js';
import { AddHashtagDto, CreatePublicacionDto, QueryPublicacionesDto, UpdatePublicacionDto } from './publicaciones.dto.js';

@Injectable()
export class PublicacionesService {
  private readonly logger = new Logger(PublicacionesService.name);

  constructor(
    @InjectModel(Publicacion.name) private readonly publicaciones: Model<Publicacion>,
    @InjectModel(Usuario.name) private readonly usuarios: Model<Usuario>,
    @InjectModel(Comentario.name) private readonly comentarios: Model<Comentario>,
    @InjectModel(Reaccion.name) private readonly reacciones: Model<Reaccion>,
    @InjectConnection() private readonly conn: Connection,
  ) {}

  async findAll(q: QueryPublicacionesDto) {
    const filtro: Record<string, unknown> = {};
    if (q.usuario_id) filtro.usuario_id = q.usuario_id;
    if (q.categoria) filtro.categoria = q.categoria;
    if (q.tipo) filtro.tipo = q.tipo;

    const [data, total] = await Promise.all([
      this.publicaciones.find(filtro).sort({ fecha_publicacion: -1, _id: 1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
      this.publicaciones.countDocuments(filtro),
    ]);
    return { data, total, page: q.page, limit: q.limit };
  }

  async findOne(id: string) {
    const doc = await this.publicaciones.findById(id).lean();
    if (!doc) throw new NotFoundException(`La publicacion ${id} no existe`);
    return doc;
  }

  async create(dto: CreatePublicacionDto) {
    // Validacion de referencia: el autor debe existir
    if (!(await this.usuarios.exists({ _id: dto.usuario_id }))) {
      throw new UnprocessableEntityException(`usuario_id ${dto.usuario_id} no existe`);
    }
    const creada = await this.publicaciones.create({
      ...dto,
      _id: dto._id ?? `pub_${randomUUID().slice(0, 8)}`,
      hashtags: dto.hashtags ?? [],
      fecha_publicacion: dto.fecha_publicacion ? new Date(dto.fecha_publicacion) : new Date(),
    });
    return creada.toObject();
  }

  async update(id: string, dto: UpdatePublicacionDto) {
    if (Object.keys(dto).length === 0) throw new BadRequestException('Sin campos para actualizar');
    const doc = await this.publicaciones.findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after', runValidators: true }).lean();
    if (!doc) throw new NotFoundException(`La publicacion ${id} no existe`);
    return doc;
  }

  // $addToSet: agrega el hashtag sin duplicarlo
  async addHashtag(id: string, dto: AddHashtagDto) {
    const doc = await this.publicaciones.findByIdAndUpdate(id, { $addToSet: { hashtags: dto.hashtag } }, { returnDocument: 'after' }).lean();
    if (!doc) throw new NotFoundException(`La publicacion ${id} no existe`);
    return doc;
  }

  async resumen(id: string) {
    const pub = await this.findOne(id);
    const [reacciones, comentarios, likes] = await Promise.all([
      this.reacciones.countDocuments({ publicacion_id: id }),
      this.comentarios.countDocuments({ publicacion_id: id }),
      this.comentarios.aggregate([{ $match: { publicacion_id: id } }, { $group: { _id: null, total: { $sum: '$likes' } } }]),
    ]);
    return { publicacion_id: pub._id, categoria: pub.categoria, tipo: pub.tipo, reacciones, comentarios, likes_en_comentarios: likes[0]?.total ?? 0 };
  }

  // Baja en cascada: evita referencias huerfanas en reacciones, comentarios y campanas
  async remove(id: string) {
    await this.findOne(id);
    const [r, c, camp] = await Promise.all([
      this.reacciones.deleteMany({ publicacion_id: id }),
      this.comentarios.deleteMany({ publicacion_id: id }),
      this.conn.collection('campanas').updateMany({ publicaciones_asociadas: id }, { $pull: { publicaciones_asociadas: id } } as never),
    ]);
    await this.publicaciones.deleteOne({ _id: id });
    this.logger.log(`Publicacion ${id} eliminada en cascada: ${r.deletedCount} reacciones, ${c.deletedCount} comentarios, ${camp.modifiedCount} campanas`);
    return { eliminado: true, id, reacciones: r.deletedCount, comentarios: c.deletedCount, campanas_actualizadas: camp.modifiedCount };
  }
}
