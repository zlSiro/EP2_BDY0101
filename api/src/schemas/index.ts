import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

// Los _id del anexo son texto ("user_1", "pub_1"...), por eso se declaran como String.

@Schema({ collection: 'usuarios', versionKey: false })
export class Usuario {
  @Prop({ type: String }) _id: string;
  @Prop({ type: String, required: true }) nombre: string;
  @Prop({ type: String, required: true }) correo: string;
  @Prop({ type: String, required: true }) pais: string;
  @Prop({ type: String, required: true }) genero: string;
  @Prop({ type: Date, required: true }) fecha_registro: Date;
  @Prop({ type: String, required: true }) dispositivo: string;
}
export const UsuarioSchema = SchemaFactory.createForClass(Usuario);

@Schema({ collection: 'publicaciones', versionKey: false })
export class Publicacion {
  @Prop({ type: String }) _id: string;
  @Prop({ type: String, required: true }) usuario_id: string;
  @Prop({ type: String, required: true }) contenido: string;
  @Prop({ type: Date, required: true }) fecha_publicacion: Date;
  @Prop({ type: String, required: true }) categoria: string;
  @Prop({ type: [String], default: [] }) hashtags: string[];
  @Prop({ type: String, required: true }) tipo: string;
  @Prop({ type: Boolean }) fecha_inconsistente?: boolean;
}
export const PublicacionSchema = SchemaFactory.createForClass(Publicacion);

@Schema({ collection: 'comentarios', versionKey: false })
export class Comentario {
  @Prop({ type: String }) _id: string;
  @Prop({ type: String, required: true }) usuario_id: string;
  @Prop({ type: String, required: true }) publicacion_id: string;
  @Prop({ type: String, required: true }) comentario: string;
  @Prop({ type: Date, required: true }) fecha: Date;
  @Prop({ type: Number, default: 0 }) likes: number;
  @Prop({ type: Boolean }) fecha_inconsistente?: boolean;
}
export const ComentarioSchema = SchemaFactory.createForClass(Comentario);

@Schema({ collection: 'reacciones', versionKey: false })
export class Reaccion {
  @Prop({ type: String }) _id: string;
  @Prop({ type: String, required: true }) usuario_id: string;
  @Prop({ type: String, required: true }) publicacion_id: string;
  @Prop({ type: String, required: true }) tipo_reaccion: string;
  @Prop({ type: Date, required: true }) fecha: Date;
  @Prop({ type: Boolean }) fecha_inconsistente?: boolean;
}
export const ReaccionSchema = SchemaFactory.createForClass(Reaccion);
