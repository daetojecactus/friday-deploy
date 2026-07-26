import { Module } from '@nestjs/common';
import { AuthController } from './api/auth.controller';
import { CustomersController } from './api/customers.controller';
import { IncidentsController } from './api/incidents.controller';
import { OrdersController } from './api/orders.controller';
import { StorageController } from './api/storage.controller';
import { TicketsController } from './api/tickets.controller';
import { StandController } from './internal/stand.controller';

@Module({
  controllers: [
    // Боевое приложение CRM.
    CustomersController,
    AuthController,
    OrdersController,
    IncidentsController,
    TicketsController,
    StorageController,
    // Служебный слой стенда.
    StandController,
  ],
})
export class AppModule {}
