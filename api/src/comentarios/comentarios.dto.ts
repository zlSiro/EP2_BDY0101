import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto.js';

export class CreateComentarioDto {
  @IsString() @IsNotEmpty() usuario_id: string;
  @IsString() @IsNotEmpty() publicacion_id: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) comentario: string;
}

export class LikeDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) cantidad: number = 1;
}

export class QueryComentariosDto extends PaginationDto {
  @IsOptional() @IsString() publicacion_id?: string;
  @IsOptional() @IsString() usuario_id?: string;
}
