import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ComentariosModule } from './comentarios/comentarios.module.js';
import { HealthController } from './health/health.controller.js';
import { PublicacionesModule } from './publicaciones/publicaciones.module.js';
import { ReaccionesModule } from './reacciones/reacciones.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // El string de conexion viene SOLO de variables de entorno (.env, no versionado)
        uri: config.getOrThrow<string>('MONGODB_URI'),
        dbName: config.get<string>('MONGODB_DB', 'EP2_BDY0101'),
        serverSelectionTimeoutMS: 5000,
        // Los indices ya existen en Atlas (script 07); la API no los crea ni los modifica
        autoIndex: false,
        autoCreate: false,
      }),
    }),
    UsuariosModule,
    PublicacionesModule,
    ComentariosModule,
    ReaccionesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
