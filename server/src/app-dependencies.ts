export type StatusType = 'rucked' | 'ricked';

export interface QueryResultLike<Row extends Record<string, unknown> = Record<string, unknown>> {
  rows: Row[];
}

export interface Queryable {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    _text: string,
    _params?: readonly unknown[]
  ): Promise<QueryResultLike<Row>>;
}

export interface DatabaseClientLike extends Queryable {
  release(): void;
}

export interface DatabasePoolLike extends Queryable {
  connect(): Promise<DatabaseClientLike>;
}

export interface PushMessage {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data: { groupId: string };
  channelId: string;
}

export interface PushSender {
  send(_messages: PushMessage[]): Promise<void>;
}

export interface AppDependencies {
  pool: DatabasePoolLike;
  pushSender: PushSender;
  idGenerator: () => string;
  now: () => Date;
}
