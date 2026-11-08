import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CreateReaccionDto, QueryReaccionesDto } from './reacciones.dto.js';
import { ReaccionesService } from './reacciones.service.js';

@Controller('reacciones')
export class ReaccionesController {
  constructor(private readonly service: ReaccionesService) {}

  @Get() findAll(@Query() q: QueryReaccionesDto) { return this.service.findAll(q); }
  @Post() create(@Body() dto: CreateReaccionDto) { return this.service.create(dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
