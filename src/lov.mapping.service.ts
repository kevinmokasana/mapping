import { HttpException, Injectable } from '@nestjs/common';
import { BulkUploadAttributeJSONData, BulkUploadCategoryJsonData, MetaData } from './dto';
import * as fs from 'fs'
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { Attribute, ChannelAttribute, ChannelCategory, ChannelReferenceAttributes, ChannelReferenceMaster, ChannelRefereneData, CoreAttribute, CoreCategory, CoreChannelReferenceDataMapping, CoreReferenceAttributes, CoreReferenceMaster, CoreRefereneData, CoreTenantReferenceDataMapping, ReferenceMasterData, TenantCategoryPath } from './tables.entity';
import * as dotenv from 'dotenv'
import { WRITE_DB_NAME } from './app.constants';
// import { DataSource, EntityManager, In } from 'typeorm'

dotenv.config()
@Injectable()
export class LovMappingService {

    constructor(
        @InjectDataSource(WRITE_DB_NAME) private dataSource:DataSource
    ){}

    async coreTenantLovMapping(tenantId:string, orgId:string){
        let fileName = `CoreTenantLovMapping.json`
        let data:any[] = JSON.parse(fs.readFileSync(fileName).toString())
        // let data = jsonData
        
        const failedRows: any[] = []

        const coreAttributes = await this.dataSource.getRepository(CoreAttribute).find({
            where:{
                attribute_name:In(data.map(x=>x['Core Attribute Name']))
            },
            select:['attribute_name', 'id']
        })

        const tenantCategories = await this.dataSource.getRepository(TenantCategoryPath).find({
            where:{
                path:In(data.map(x=>x['Tenant Category Path'])),
                tenant_id:tenantId,
                org_id:orgId
            },
            select:['path', 'id']
        })

        const TenantAttributes = await this.dataSource.getRepository(Attribute).find({
            where:{
                attribute_name:In(data.map(x=>x['Tenant Attribute Name'])),
                tenant_id:tenantId,
                org_id:orgId
            },
            select:['attribute_name', 'id', 'reference_master_id', 'reference_attribute_id']
        })

        let entityManager = this.dataSource.createEntityManager()

        for(let row of data){
            const tenantCategory = tenantCategories.find(x=>x.path===row['Tenant Category Path'])
            const coreAttribute = coreAttributes.find(x=>x.attribute_name===row['Core Attribute Name'])
            const tenantAttribute = TenantAttributes.find(x=>x.attribute_name===row['Tenant Attribute Name'])//row['Channel Attribute Name']
            let errors = []
            if(tenantCategory===undefined)
                errors.push({ ...row, error: `Tenant Category ${row['Tenant Category Path']} does not exist` })
            if(coreAttribute===undefined)
                errors.push({ ...row, error: `Core Attribute ${row['Core Attribute Name']} does not exist` })
            if(tenantAttribute===undefined)
                errors.push({ ...row, error: `Tenant Attribute ${row['Tenant Attribute Name']} does not exist` })

            if(errors.length>0){
                failedRows.push(...errors)
                continue
            }
        
            let core_rmdm_id = await entityManager.getRepository(CoreRefereneData).findOne({
                where:{
                    attribute_id:coreAttribute.id,
                    value: row['Core Reference Data']
                },
                select:['rmdm_id']
            })

            if(core_rmdm_id == undefined){
                errors.push({ ...row, error: `Core Reference Data ${row['Core Reference Data']} does not exist in Core Attribute ${row['Core Attribute Name']}` })
            }

            let tenant_rmdm_id = await entityManager.getRepository(ReferenceMasterData).findOne({
                where:{
                    rm_id:tenantAttribute.reference_master_id,
                    ra_id:tenantAttribute.reference_attribute_id,
                    tenant_id:tenantId,
                    org_id:orgId,
                    value: row['Tenant Reference Data'],
                },
                select:['rmdm_id']
            })

            if(tenant_rmdm_id == undefined){
                errors.push({ ...row, error: `Tenant Reference Data ${row['Tenant Reference Data']} does not exist in Tenant Attribute ${row['Tenant Attribute Name']} & Tenant Category ${row['Tenant Category Path']}` })
            }
            
            if(errors.length>0){
                failedRows.push(...errors)
                continue
            }

            await entityManager
            .createQueryBuilder()
            .insert()
            .into(CoreTenantReferenceDataMapping)
            .values({
                core_rmdm_id:core_rmdm_id.rmdm_id,
                tenant_rmdm_id:tenant_rmdm_id.rmdm_id,
                core_attribute_id:coreAttribute.id,
                tenant_attribute_id:tenantAttribute.id,
                tenant_category_id:tenantCategory.id,
                tenant_id:tenantId,
                org_id:orgId
            })
            .orIgnore()
            .execute()
        }

        fs.writeFileSync('core_tenant_lov_mapping_failed.json', JSON.stringify(failedRows, null, 2), 'utf-8');
        console.log("JSON file created successfully!");

    }
    async coreChnanelLovMapping(channelId:number){
        let fileName = `CoreChannelLovMapping.json`
        let data:any[] = JSON.parse(fs.readFileSync(fileName).toString())
        
        const failedRows: any[] = [] 

        const channelCategories = await this.dataSource.getRepository(ChannelCategory).find({
            where:{
                category_path:In(data.map(x=>x['Channel Category Path'])),
                channel_id:channelId
            },
            select:['category_path', 'id']
        })

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

        let entityManager = this.dataSource.createEntityManager()
        let i = 0
        for(let row of data){
            i++;
            console.log(i);
            const channelCategory = channelCategories.find(x=>x.category_path===row['Channel Category Path'])
            const coreAttribute = coreAttributes.find(x=>x.attribute_name===row['Core Attribute Name'])
            const channelAttribute = channelAttributes.find(x=>x.attribute_name===row['Channel Attribute Name'])//row['Channel Attribute Name']

            let errors = []
            if(channelCategory===undefined)
                errors.push({ ...row, error: `Channel Category ${row['Channel Category Path']} does not exist` })
            if(coreAttribute===undefined)
                errors.push({ ...row, error: `Core Attribute ${row['Core Attribute Name']} does not exist` })
            if(channelAttribute===undefined)
                errors.push({ ...row, error: `Channel Attribute ${row['Channel Attribute Name']} does not exist` })

            if(errors.length>0){
                failedRows.push(...errors)
                continue
            }
        
            let core_rmdm_id = await entityManager.getRepository(CoreRefereneData).findOne({
                where:{
                    attribute_id:coreAttribute.id,
                    value: row['Core Reference Data']
                },
                select:['rmdm_id']
            })

            let channel_rmdm_id = await entityManager.getRepository(ChannelRefereneData).findOne({
                where:{
                    attribute_id:channelAttribute.id,
                    category_id:channelCategory.id,
                    channel_id:channelId,
                    value: row['Channel Reference Data'],
                },
                select:['rmdm_id']
            })

            if(core_rmdm_id == undefined)
                errors.push({ ...row, error: `Core Reference Data ${row['Core Reference Data']} does not exist in Core Attribute ${row['Core Attribute Name']}` })
            if(channel_rmdm_id == undefined)
                errors.push({ ...row, error: `Channel Reference Data ${row['Channel Reference Data']} does not exist in Channel Attribute ${row['Channel Attribute Name']} & Channel Category ${row['Channel Category Path']}` })
            
            if(errors.length>0){
                failedRows.push(...errors)
                continue
            }

            await entityManager
            .createQueryBuilder()
            .insert()
            .into(CoreChannelReferenceDataMapping)
            .values({
                core_rmdm_id:core_rmdm_id.rmdm_id,
                channel_rmdm_id:channel_rmdm_id.rmdm_id,
                core_attribute_id:coreAttribute.id,
                channel_attribute_id:channelAttribute.id,
                channel_category_id:channelCategory.id,
                channel_id:channelId
            })
            .orIgnore()
            .execute()


        }

        fs.writeFileSync('core_channel_lov_mapping_failed.json', JSON.stringify(failedRows, null, 2), 'utf-8');
        console.log("JSON file created successfully!");

    }
    
}

