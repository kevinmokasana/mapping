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
import { NewMappingService } from './new.mapping.service';
import { LOVExtractor } from './lov.extractor';
import { TaskService } from './task.service';
import { S3Service } from './s3.service';
import { BullModule } from '@nestjs/bullmq';
import { TaskProcessor } from './task.processor';
import { REDIS_CONNECTION } from './app.constants';
dotenv.config()
@Module({
  imports: [
    TypeOrmModule.forRoot({ ...DatabaseConfig, name: process.env.WRITE_DB_NAME }),
    TypeOrmModule.forRoot({ ...ReadDatabaseConfig, name: process.env.READ_DB_NAME }),
    BullModule.forRoot({
      connection: {
        host: String(REDIS_CONNECTION),
        port: 6379,
      },
    }), 
    BullModule.registerQueue({
      name: 'task-queue',
    }),
  ],
  controllers: [AppController],
  providers: [LOVExtractor, NewMappingService, ExcelToJson, CategoryCreation, CategoryMappingService, AttributeCreation, AttributeMappingService, LovCreation, LovMappingService, TaskService, S3Service, TaskProcessor],
})
export class AppModule { }
