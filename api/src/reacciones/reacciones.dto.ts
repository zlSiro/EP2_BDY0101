import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto.js';

export const TIPOS_REACCION = ['Me gusta', 'Me encanta', 'Me enoja', 'Me entristece'];

export class CreateReaccionDto {
  @IsString() @IsNotEmpty() usuario_id: string;
  @IsString() @IsNotEmpty() publicacion_id: string;
  @IsIn(TIPOS_REACCION) tipo_reaccion: string;
}

export class QueryReaccionesDto extends PaginationDto {
  @IsOptional() @IsString() publicacion_id?: string;
  @IsOptional() @IsString() usuario_id?: string;
  @IsOptional() @IsIn(TIPOS_REACCION) tipo_reaccion?: string;
}
