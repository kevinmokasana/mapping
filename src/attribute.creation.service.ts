import { HttpException, Injectable } from '@nestjs/common';
import { BulkUploadCategoryJsonData, MetaData } from './dto';
import * as fs from 'fs'
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { ChannelCategory, CoreCategory } from './tables.entity';
import * as dotenv from 'dotenv'
import { WRITE_DB_NAME } from './app.constants';
dotenv.config()
@Injectable()
export class AttributeCreation {

    constructor(
        @InjectDataSource(WRITE_DB_NAME) private dataSource:DataSource
    ){}

//    async bulkUploadAttribute(){
//         let fileName = type===`core` ? `CoreCategory.json` : `ChannelCategory.json`
//         let jsonData:BulkUploadCategoryJsonData[] = JSON.parse(fs.readFileSync(fileName).toString())
//         let category2DArray = {}
//         let data = jsonData


//    }
}
