import { HttpException, Injectable } from '@nestjs/common';
import { BulkUploadCategoryAttributeMappingJSONData, BulkUploadCategoryJsonData, MetaData } from './dto';
import * as fs from 'fs'
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { ChannelAttribute, ChannelCategory, ChannelCategoryAssignment, CoreAttribute, CoreCategory, CoreCategoryAssignment } from './tables.entity';
import * as dotenv from 'dotenv'
import { WRITE_DB_NAME } from './app.constants';
dotenv.config()
@Injectable()
export class CategoryAttributeMapping {

    constructor(
        @InjectDataSource(WRITE_DB_NAME) private dataSource:DataSource
    ){}

    async categoryAttributeMapping(type:`Core`|`Channel`, channelId?:number){
        let fileName = type===`Core` ? `CoreCategoryAttributeMapping.json` : `ChannelCategoryAttributeMapping.json`
        let jsonData:BulkUploadCategoryAttributeMappingJSONData[] = JSON.parse(fs.readFileSync(fileName).toString())
        let data = jsonData
        const failedRows: any[] = []
        const entityManager = this.dataSource.createEntityManager()
        const Attributes = type===`Core` ? CoreAttribute : ChannelAttribute
        const Category = type===`Core` ? CoreCategory : ChannelCategory
        const CategoryAttributeMapping = type===`Core` ? CoreCategoryAssignment : ChannelCategoryAssignment
        const categoryPathIdMap:Record<string, number> = {}
        const attributeIdMap:Record<string, {id:number, mandatory:boolean}> = {}

        for(let row of data){

            const categoryPath = row['Category Path']
            const attributeName = row['Attribute Name']

            let categoryId:number
            if(categoryPathIdMap[categoryPath]===undefined){
                const category = await entityManager.getRepository(Category).findOne({
                    where:{
                        category_path:categoryPath,
                        ...(type===`Core` ? {} : {channel_id:channelId})
                    }
                })
                if(category===null || category===undefined){
                    failedRows.push({ ...row, error: `Category ${categoryPath} does not exist` })
                    continue
                }
                if(category.is_leaf===false){
                    failedRows.push({ ...row, error: `${categoryPath} is not leaf category` })
                    continue
                }
                categoryId = category.id
            }else{
                categoryId = categoryPathIdMap[categoryPath]
            }

            let attributeId:number
            let isMandatory:boolean
            if(attributeIdMap[attributeName]===undefined){
                const attribute = await entityManager.getRepository(Attributes).findOne({
                    where:{
                        attribute_name:attributeName,
                        ...(type===`Core` ? {} : {channel_id:channelId})
                    }
                })
                if(attribute===null || attribute===undefined){
                    failedRows.push({ ...row, error: `Attribute: [${attributeName}] does not exist` })
                    continue
                }
                attributeId = attribute.id
                isMandatory = (row['Mandatory']===null || row['Mandatory']===undefined || row['Mandatory'].toString()==='') ? attribute.mandatory : row['Mandatory']
            }else{
                attributeId = attributeIdMap[attributeName].id
                isMandatory = (row['Mandatory']===null || row['Mandatory']===undefined || row['Mandatory'].toString()==='') ? attributeIdMap[attributeName].mandatory : row['Mandatory']
            }

            await entityManager.getRepository(CategoryAttributeMapping).save({
                attribute_id:attributeId,
                catergory_id:categoryId,
                ...(type===`Core` ? {} : {channel_id:channelId})
            })
        }
    }
}