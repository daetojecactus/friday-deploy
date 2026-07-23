import { Module } from '@nestjs/common';
import { ChecksController } from './checks.controller';
import {
  DashboardController,
  VendorController,
  ExternalsController,
} from './internal/controllers';

@Module({
  controllers: [
    ChecksController,
    DashboardController,
    VendorController,
    ExternalsController,
  ],
})
export class AppModule {}
