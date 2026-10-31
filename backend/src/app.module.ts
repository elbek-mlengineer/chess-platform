import { Module } from '@nestjs/common';
import { OnlineModule } from './online/online.module';
import { HealthController } from './health.controller';
import { BackendConfigModule } from './config/backend-config.module';

@Module({
  imports: [BackendConfigModule, OnlineModule],
  controllers: [HealthController],
})
export class AppModule {}
