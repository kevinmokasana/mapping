import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ExcelToJson } from './exceltojson.service';
import { CategoryCreation } from './category.creation.service';

import { DatabaseConfig, ReadDatabaseConfig } from './orm.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv'
dotenv.config()
@Module({
  imports: [
    TypeOrmModule.forRoot({...DatabaseConfig, name: process.env.WRITE_DB_NAME}),
    TypeOrmModule.forRoot({...ReadDatabaseConfig, name: process.env.READ_DB_NAME}),
  ],
  controllers: [AppController],
  providers: [ExcelToJson, CategoryCreation],
})
export class AppModule {}
