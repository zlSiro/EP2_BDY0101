import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';
import type { Model } from 'mongoose';
import { Publicacion, Usuario } from '../schemas/index.js';
import { CreateUsuarioDto, QueryUsuariosDto, UpdateUsuarioDto } from './usuarios.dto.js';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name) private readonly usuarios: Model<Usuario>,
    @InjectModel(Publicacion.name) private readonly publicaciones: Model<Publicacion>,
  ) {}

  async findAll(q: QueryUsuariosDto) {
    const filtro: Record<string, unknown> = {};
    if (q.pais) filtro.pais = q.pais;
    if (q.genero) filtro.genero = q.genero;
    if (q.dispositivo) filtro.dispositivo = q.dispositivo;

    const [data, total] = await Promise.all([
      this.usuarios.find(filtro).sort({ fecha_registro: -1, _id: 1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
      this.usuarios.countDocuments(filtro),
    ]);
    return { data, total, page: q.page, limit: q.limit };
  }

  async findOne(id: string) {
    const doc = await this.usuarios.findById(id).lean();
    if (!doc) throw new NotFoundException(`El usuario ${id} no existe`);
    return doc;
  }

  async create(dto: CreateUsuarioDto) {
    const creado = await this.usuarios.create({
      ...dto,
      _id: dto._id ?? `user_${randomUUID().slice(0, 8)}`,
      fecha_registro: dto.fecha_registro ? new Date(dto.fecha_registro) : new Date(),
    });
    return creado.toObject();
  }

  async update(id: string, dto: UpdateUsuarioDto) {
    if (Object.keys(dto).length === 0) throw new BadRequestException('Sin campos para actualizar');
    const doc = await this.usuarios.findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after', runValidators: true }).lean();
    if (!doc) throw new NotFoundException(`El usuario ${id} no existe`);
    return doc;
  }

  async remove(id: string) {
    await this.findOne(id);
    const publicaciones = await this.publicaciones.countDocuments({ usuario_id: id });
    if (publicaciones > 0) {
      throw new ConflictException(`No se puede eliminar: el usuario tiene ${publicaciones} publicaciones asociadas`);
    }
    await this.usuarios.deleteOne({ _id: id });
    return { eliminado: true, id };
  }
}
