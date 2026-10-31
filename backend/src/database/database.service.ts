import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { DatabaseSync } from 'node:sqlite';
import { BACKEND_CONFIG, type BackendConfig } from '../config/backend-config';
import { openDatabase } from './database';
import { migrateLegacyDatabase } from './migrate-legacy-database';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private database: DatabaseSync | null = null;
  constructor(@Inject(BACKEND_CONFIG) private readonly config: BackendConfig) {}
  async onModuleInit() {
    const migrated = await migrateLegacyDatabase(
      this.config.databasePath,
      this.config.legacyDatabasePath,
    );
    if (migrated)
      new Logger(DatabaseService.name).log(
        'Existing online data migrated to backend storage; original retained.',
      );
    this.database = openDatabase(this.config.databasePath);
  }
  get connection(): DatabaseSync {
    if (!this.database) throw new Error('Database is not initialized');
    return this.database;
  }
  onModuleDestroy() {
    this.database?.close();
    this.database = null;
  }
}
