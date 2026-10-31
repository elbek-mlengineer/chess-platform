import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { OnlineApplicationService } from './online-application.service';
import { OnlineController } from './online.controller';
@Module({
  imports: [DatabaseModule],
  providers: [OnlineApplicationService],
  controllers: [OnlineController],
})
export class OnlineModule {}
