import { HttpException, Injectable } from '@nestjs/common';
import { BulkUploadAttributeMappingJSONData, BulkUploadCategoryJsonData, BulkUploadCatMappingJSONData, MetaData } from './dto';
import * as fs from 'fs'
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { ChannelAttribute, ChannelCategory, ChannelCategoryAssignment, CoreAttribute, CoreCategory, CoreCategoryAssignment, CoreChannelAttributeMappings, CoreChannelCategoryMapping, TenantCategoryPath } from './tables.entity';
import { WRITE_DB_NAME } from './app.constants';
@Injectable()
export class AttributeMappingService {

    constructor(
        @InjectDataSource(WRITE_DB_NAME) private dataSource:DataSource

    ){}

    async coreChannleAttributeMapping(channelId:number){
        let fileName = `CoreChannelAttributeMapping.json`
        let data:BulkUploadAttributeMappingJSONData[] = JSON.parse(fs.readFileSync(fileName).toString())
        // let data = jsonData
        
        const failedRows: any[] = []

        const coreAttributes = await this.dataSource.getRepository(CoreAttribute).find({
            where:{
                attribute_name:In(data.map(x=>x['Core Attribute Name']))
            },
            select:['attribute_name', 'id']
        })

        const channelAttributes = await this.dataSource.getRepository(ChannelAttribute).find({
            where:{
                attribute_name:In(data.map(x=>x['Channel Attribute Name'])),
                channel_id:channelId
            },
            select:['attribute_name', 'id']
        })

        const coreCategories = await this.dataSource.getRepository(CoreCategory).find({
            where:{
                category_path:In(data.map(x=>x['Core Category Path']))
            },
            select:['category_path', 'id']
        })

        const channelCategories = await this.dataSource.getRepository(ChannelCategory).find({
            where:{
                category_path:In(data.map(x=>x['Core Category Path'])),
                channel_id:channelId
            },
            select:['category_path', 'id']
        })

        let entityManager = this.dataSource.createEntityManager()
        for(let row of data){
            const coreAttribute = coreAttributes.find(x=>x.attribute_name===row['Core Attribute Name'])
            const channelAttribute = channelAttributes.find(x=>x.attribute_name===row['Channel Attribute Name'])//row['Channel Attribute Name']
            const coreCategory = coreCategories.find(x=>x.category_path===row['Core Category Path'])
            const channelCategory = channelCategories.find(x=>x.category_path===row['Channel Category Path'])

            let errors = []
            if(coreAttribute===undefined)
                errors.push(`Core Attribute ${row['Core Attribute Name']} does not exist`)
            if(channelAttribute===undefined)
                errors.push(`Channel Attribute ${row['Channel Attribute Name']} does not exist`)
            if(coreCategory===undefined)
                errors.push(`Core Category ${row['Core Category Path']} does not exist`)
            if(channelCategory===undefined)
                errors.push(`Channel Category ${row['Channel Category Path']} does not exist`)

            if(errors.length!=0){
                failedRows.push({
                    ...row,
                    error:errors.join(',')
                })
                continue
            }

            //Chacking for Assignments
            const coreAssignment = await entityManager.getRepository(CoreCategoryAssignment).findOne({
                where:{
                    category_id:coreCategory.id,
                    attribute_id:coreAttribute.id
                }
            })
            if(coreAssignment===undefined || coreAssignment===null)
                errors.push(`Core Assignment ${coreCategory.category_path} <--> ${coreAttribute.attribute_name} does not exist`)

            const channelAssignment = await entityManager.getRepository(ChannelCategoryAssignment).findOne({
                where:{
                    category_id:coreCategory.id,
                    attribute_id:coreAttribute.id,
                    channel_id:channelId
                }
            })
            if(channelAssignment===undefined || channelAssignment===null)
                errors.push(`Core Assignment ${channelCategory.category_path} <--> ${channelAttribute.attribute_name} does not exist`)

            await entityManager.getRepository(CoreChannelAttributeMappings).save({
                core_attribute_id:coreAttribute.id,
                channel_attribute_id: channelAttribute.id,
                core_category_id: coreCategory.id,
                channel_category_id:channelCategory.id,
                channel_id:channelId
            })
        }
    }

}