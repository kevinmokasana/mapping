import { HttpException, Injectable } from '@nestjs/common';
import { BulkUploadAttributeJSONData, BulkUploadCategoryJsonData, MetaData } from './dto';
import * as fs from 'fs'
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { ChannelAttribute, ChannelCategory, ChannelReferenceAttributes, ChannelReferenceMaster, CoreAttribute, CoreCategory, CoreReferenceAttributes, CoreReferenceMaster } from './tables.entity';
import * as dotenv from 'dotenv'
import { WRITE_DB_NAME } from './app.constants';
dotenv.config()
@Injectable()
export class LovCreation {

    constructor(
        @InjectDataSource(WRITE_DB_NAME) private dataSource:DataSource
    ){}


}
