import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AddHashtagDto, CreatePublicacionDto, QueryPublicacionesDto, UpdatePublicacionDto } from './publicaciones.dto.js';
import { PublicacionesService } from './publicaciones.service.js';

@Controller('publicaciones')
export class PublicacionesController {
  constructor(private readonly service: PublicacionesService) {}

  @Get() findAll(@Query() q: QueryPublicacionesDto) { return this.service.findAll(q); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Get(':id/resumen') resumen(@Param('id') id: string) { return this.service.resumen(id); }
  @Post() create(@Body() dto: CreatePublicacionDto) { return this.service.create(dto); }
  @Post(':id/hashtags') addHashtag(@Param('id') id: string, @Body() dto: AddHashtagDto) { return this.service.addHashtag(id, dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePublicacionDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
