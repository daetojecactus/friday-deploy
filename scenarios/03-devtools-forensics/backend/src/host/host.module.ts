import { Module } from '@nestjs/common';
import { HostController } from './host.controller';

// Дашборд ведущего. Отдельный сервис и отдельный порт: он знает все ответы, и
// ему нечего делать рядом с тем портом, который команда всю игру изучает в
// Network.
@Module({ controllers: [HostController] })
export class HostModule {}
