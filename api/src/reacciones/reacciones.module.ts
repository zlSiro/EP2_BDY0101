import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Publicacion, PublicacionSchema, Reaccion, ReaccionSchema, Usuario, UsuarioSchema } from '../schemas/index.js';
import { ReaccionesController } from './reacciones.controller.js';
import { ReaccionesService } from './reacciones.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reaccion.name, schema: ReaccionSchema },
      { name: Usuario.name, schema: UsuarioSchema },
      { name: Publicacion.name, schema: PublicacionSchema },
    ]),
  ],
  controllers: [ReaccionesController],
  providers: [ReaccionesService],
})
export class ReaccionesModule {}
