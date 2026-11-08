import { IsDateString, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaginationDto } from '../common/pagination.dto.js';

export const GENEROS = ['Femenino', 'Masculino', 'Otro'];
export const DISPOSITIVOS = ['Desktop', 'Móvil', 'Tablet'];

export class CreateUsuarioDto {
  @IsOptional() @IsString() @Matches(/^user_[\w-]+$/, { message: '_id debe tener formato user_xxx' }) _id?: string;
  @IsString() @IsNotEmpty() @MaxLength(100) nombre: string;
  @IsEmail() correo: string;
  @IsString() @IsNotEmpty() pais: string;
  @IsIn(GENEROS) genero: string;
  @IsIn(DISPOSITIVOS) dispositivo: string;
  @IsOptional() @IsDateString() fecha_registro?: string;
}

export class UpdateUsuarioDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) nombre?: string;
  @IsOptional() @IsEmail() correo?: string;
  @IsOptional() @IsString() @IsNotEmpty() pais?: string;
  @IsOptional() @IsIn(GENEROS) genero?: string;
  @IsOptional() @IsIn(DISPOSITIVOS) dispositivo?: string;
}

export class QueryUsuariosDto extends PaginationDto {
  @IsOptional() @IsString() pais?: string;
  @IsOptional() @IsIn(GENEROS) genero?: string;
  @IsOptional() @IsIn(DISPOSITIVOS) dispositivo?: string;
}
