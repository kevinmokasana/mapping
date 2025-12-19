import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ExcelToJson } from './exceltojson.service';
import { CategoryCreation } from './category.creation.service';

import { DatabaseConfig, ReadDatabaseConfig } from './orm.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv'
import { CategoryMappingService } from './category.mapping.service';
import { AttributeCreation } from './attribute.creation.service';
import { AttributeMappingService } from './attribute.mapping.service';
import { LovCreation } from './lov.creation.service';
import { LovMappingService } from './lov.mapping.service';
dotenv.config()
@Module({
  imports: [
    TypeOrmModule.forRoot({...DatabaseConfig, name: process.env.WRITE_DB_NAME}),
    TypeOrmModule.forRoot({...ReadDatabaseConfig, name: process.env.READ_DB_NAME}),
  ],
  controllers: [AppController],
  providers: [ExcelToJson, CategoryCreation, CategoryMappingService, AttributeCreation, AttributeMappingService, LovCreation, LovMappingService],
})
export class AppModule {}
