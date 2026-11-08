import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto.js';

export const CATEGORIAS = ['Cultura', 'Deportes', 'Educación', 'Entretenimiento', 'Tecnología'];
export const TIPOS = ['Imagen', 'Texto', 'Video'];
const HASHTAG = /^#\w+$/;

export class CreatePublicacionDto {
  @IsOptional() @IsString() @Matches(/^pub_[\w-]+$/, { message: '_id debe tener formato pub_xxx' }) _id?: string;
  @IsString() @IsNotEmpty() usuario_id: string;
  @IsString() @IsNotEmpty() @MaxLength(2000) contenido: string;
  @IsIn(CATEGORIAS) categoria: string;
  @IsIn(TIPOS) tipo: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @Matches(HASHTAG, { each: true, message: 'Cada hashtag debe ser #palabra' }) hashtags?: string[];
  @IsOptional() @IsDateString() fecha_publicacion?: string;
}

export class UpdatePublicacionDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(2000) contenido?: string;
  @IsOptional() @IsIn(CATEGORIAS) categoria?: string;
  @IsOptional() @IsIn(TIPOS) tipo?: string;
}

export class AddHashtagDto {
  @IsString() @Matches(HASHTAG, { message: 'El hashtag debe ser #palabra' }) hashtag: string;
}

export class QueryPublicacionesDto extends PaginationDto {
  @IsOptional() @IsString() usuario_id?: string;
  @IsOptional() @IsIn(CATEGORIAS) categoria?: string;
  @IsOptional() @IsIn(TIPOS) tipo?: string;
}
