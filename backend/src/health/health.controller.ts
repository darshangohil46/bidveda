import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Liveness + database check, used by Docker and uptime monitors' })
  async check() {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', time: new Date().toISOString() };
  }
}
