import { Module } from '@nestjs/common';
import { SiteController } from './site.controller';
import { ContentController } from './content.controller';

// Публичный контур: лендинг и его API. Это единственный адрес, который
// получает команда.
@Module({ controllers: [ContentController, SiteController] })
export class PublicModule {}
