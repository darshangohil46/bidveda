import { ActorType } from './enums';

/** Who performed a status change. */
export interface Actor {
  type: ActorType;
  id: string | null;
  name: string | null;
}

export interface HistoryEntry {
  rfqId: string;
  quoteId?: string | null;
  from: string | null;
  to: string;
  actor: Actor;
  note?: string | null;
}
