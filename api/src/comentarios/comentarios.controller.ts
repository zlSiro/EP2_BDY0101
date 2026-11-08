import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateComentarioDto, LikeDto, QueryComentariosDto } from './comentarios.dto.js';
import { ComentariosService } from './comentarios.service.js';

@Controller('comentarios')
export class ComentariosController {
  constructor(private readonly service: ComentariosService) {}

  @Get() findAll(@Query() q: QueryComentariosDto) { return this.service.findAll(q); }
  @Post() create(@Body() dto: CreateComentarioDto) { return this.service.create(dto); }
  @Patch(':id/like') like(@Param('id') id: string, @Body() dto: LikeDto) { return this.service.like(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
