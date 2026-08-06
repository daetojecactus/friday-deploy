import { Module } from '@nestjs/common';
import { CorpController } from './corp.controller';

// Внутренний контур ReportDailyBot: конец каждой ниточки, которую команда
// тянет с лендинга.
@Module({ controllers: [CorpController] })
export class CorpModule {}
