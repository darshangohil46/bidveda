import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { StatusHistory } from '../schema';
import { AuthUser } from '../types/auth.types';
import { ActorType } from '../types/enums';
import { Actor, HistoryEntry } from '../types/history.types';

export function userActor(user: AuthUser): Actor {
  return { type: ActorType.USER, id: user.id, name: user.name };
}

/** Writes the append-only trail of RFQ and quote status changes, inside the caller's transaction. */
@Injectable()
export class StatusHistoryService {
  async record(manager: EntityManager, entry: HistoryEntry): Promise<void> {
    await manager.insert(StatusHistory, {
      rfqId: entry.rfqId,
      quoteId: entry.quoteId ?? null,
      fromStatus: entry.from,
      toStatus: entry.to,
      actorType: entry.actor.type,
      actorId: entry.actor.id,
      actorName: entry.actor.name,
      note: entry.note ?? null,
    });
  }
}
