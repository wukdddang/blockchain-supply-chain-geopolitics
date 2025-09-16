import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TradeDataController } from './trade-data.controller';
import { TradeDataService } from './trade-data.service';

@Module({
  imports: [],
  controllers: [AppController, TradeDataController],
  providers: [AppService, TradeDataService],
})
export class AppModule {}
