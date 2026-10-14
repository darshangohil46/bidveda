import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, EntityManager } from 'typeorm';

/**
 * Moves PUBLISHED RFQs past their deadline to CLOSED and writes the history row,
 * in one SQL statement. It runs on a schedule AND lazily before reads and awards,
 * so correctness never depends on the cron firing on time. Submission itself is
 * guarded by the deadline check, not by this status.
 */
@Injectable()
export class RfqLifecycleService {
  private readonly logger = new Logger(RfqLifecycleService.name);

  constructor(private readonly dataSource: DataSource) {}

  async closeExpired(manager?: EntityManager, rfqId?: string): Promise<number> {
    const runner = manager ?? this.dataSource.manager;
    const rows: unknown[] = await runner.query(
      `WITH closed AS (
         UPDATE rfqs
            SET status = 'CLOSED', updated_at = now()
          WHERE status = 'PUBLISHED'
            AND deadline <= clock_timestamp()
            ${rfqId ? 'AND id = $1' : ''}
         RETURNING id
       )
       INSERT INTO status_history (rfq_id, from_status, to_status, actor_type, actor_name, note)
       SELECT id, 'PUBLISHED', 'CLOSED', 'SYSTEM', 'System', 'Submission deadline reached'
         FROM closed
       RETURNING rfq_id`,
      rfqId ? [rfqId] : [],
    );
    return rows.length;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async closeExpiredOnSchedule(): Promise<void> {
    try {
      const closed = await this.closeExpired();
      if (closed > 0) this.logger.log(`Closed ${closed} RFQ(s) past their deadline`);
    } catch (error) {
      this.logger.error(
        `Scheduled close failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /** Database clock; every deadline decision uses this one clock. */
  async dbNow(manager: EntityManager): Promise<Date> {
    const rows: { now: Date }[] = await manager.query('SELECT clock_timestamp() AS now');
    return new Date(rows[0].now);
  }
}
