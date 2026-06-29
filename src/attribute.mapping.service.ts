import { HttpException, Injectable } from '@nestjs/common';
import { BulkUploadAttributeMappingJSONData, BulkUploadCategoryJsonData, BulkUploadCatMappingJSONData, MetaData } from './dto';
import * as fs from 'fs'
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not } from 'typeorm';
import { Attribute, ChannelAttribute, ChannelCategory, ChannelCategoryAssignment, CoreAttribute, CoreCategory, CoreCategoryAssignment, CoreChannelAttributeMappings, CoreChannelCategoryMapping, CoreTenantAttributeMappings, TenantCategoryAssignment, TenantCategoryPath } from './tables.entity';
import { WRITE_DB_NAME } from './app.constants';
@Injectable()
export class AttributeMappingService {

    constructor(
        @InjectDataSource(WRITE_DB_NAME) private dataSource: DataSource

    ) { }

    async coreChannleAttributeMapping(channelId: number) {
        let fileName = `CoreChannelAttributeMapping.json`
        let data: BulkUploadAttributeMappingJSONData[] = JSON.parse(fs.readFileSync(fileName).toString())
        // let data = jsonData

        const failedRows: any[] = []

        const coreAttributes = await this.dataSource.getRepository(CoreAttribute).find({
            where: {
                attribute_name: In(data.map(x => x['Core Attribute Name']))
            },
            select: ['attribute_name', 'id']
        })

        const channelAttributes = await this.dataSource.getRepository(ChannelAttribute).find({
            where: {
                attribute_name: In(data.map(x => x['Channel Attribute Name'])),
                channel_id: channelId
            },
            select: ['attribute_name', 'id']
        })

        const coreCategories = await this.dataSource.getRepository(CoreCategory).find({
            where: {
                category_path: In(data.map(x => x['Core Category Path']))
            },
            select: ['category_path', 'id']
        })

        const channelCategories = await this.dataSource.getRepository(ChannelCategory).find({
            where: {
                category_path: In(data.map(x => x['Channel Category Path'])),
                channel_id: channelId
            },
            select: ['category_path', 'id']
        })

        let entityManager = this.dataSource.createEntityManager()
        let i = 0
        for (let row of data) {
            
            console.log(i);
            i++; 
            try {
                //check for empty fields
                let errors = []
                //give an generic error
                //check in one if condition 
                if (row['Core Attribute Name'] === null || row['Channel Attribute Name'] === null || row['Core Category Path'] === null || row['Channel Category Path'] === null) {
                    errors.push(`One of Fields is empty `)
                }
 
                const coreAttribute = coreAttributes.find(x => x.attribute_name === row['Core Attribute Name'])
                const channelAttribute = channelAttributes.find(x => x.attribute_name === row['Channel Attribute Name'])//row['Channel Attribute Name']
                const coreCategory = coreCategories.find(x => x.category_path === row['Core Category Path'])
                const channelCategory = channelCategories.find(x => x.category_path === row['Channel Category Path'])

                // let errors = [] 
                if (coreAttribute === undefined)
                    errors.push(`Core Attribute ${row['Core Attribute Name']} does not exist`)
                if (channelAttribute === undefined)
                    errors.push(`Channel Attribute ${row['Channel Attribute Name']} does not exist`)
                if (coreCategory === undefined)
                    errors.push(`Core Category ${row['Core Category Path']} does not exist`)
                if (channelCategory === undefined)
                    errors.push(`Channel Category ${row['Channel Category Path']} does not exist`)

                if (errors.length != 0) {
                    failedRows.push({
                        ...row,
                        error: errors.join(',')
                    })
                    continue
                }

                //Checking for Assignments
                // const coreAssignment = await entityManager.getRepository(CoreCategoryAssignment).findOne({
                //     where:{
                //         category_id:coreCategory.id,
                //         attribute_id:coreAttribute.id
                //     }
                // })
                // if(coreAssignment===undefined || coreAssignment===null)
                //     errors.push(`Core Assignment ${coreCategory.category_path} <--> ${coreAttribute.attribute_name} does not exist`)

                // const channelAssignment = await entityManager.getRepository(ChannelCategoryAssignment).findOne({
                //     where:{
                //         category_id:coreCategory.id,
                //         attribute_id:coreAttribute.id,
                //         channel_id:channelId
                //     }
                // })
                // if(channelAssignment===undefined || channelAssignment===null)
                //     errors.push(`Core Assignment ${channelCategory.category_path} <--> ${channelAttribute.attribute_name} does not exist`)

                await entityManager.createQueryBuilder().insert().into(CoreChannelAttributeMappings).values({
                    core_attribute_id: coreAttribute.id,
                    channel_attribute_id: channelAttribute.id,
                    core_category_id: coreCategory.id,
                    channel_category_id: channelCategory.id,
                    channel_id: channelId
                }).orIgnore().execute()
            }
            catch (e) {
                failedRows.push({
                    ...row,
                    error: e.message
                })
            }
        }
        // console.log(failedRows);
        fs.writeFileSync('core_channe_attribute_mapping_failed.json', JSON.stringify(failedRows, null, 2), 'utf-8');
        console.log("JSON file created successfully!");

    }

    async coreTenantAttributeMapping(tenant_id: string, org_id: string) {
        let fileName = `CoreTenantAttributeMapping.json`
        let data: BulkUploadAttributeMappingJSONData[] = JSON.parse(fs.readFileSync(fileName).toString())
        // let data = jsonData

        console.log(tenant_id, org_id);
        
        const failedRows: any[] = []
        //i have not created attribute group Model
        // const attributeGroupId = await this.dataSource.getRepository(AttributeGroup).findOne({
        //     where: {
        //         name: "General"
        //     }
        // })
        let variation_attributes = ['code', 'sku_name']
        const [{attributeGroupId}] = await this.dataSource.query(`SELECT id as "attributeGroupId" FROM attribute_groups WHERE attribute_group_name = 'Variations (Default Group by PIM)' AND tenant_id = '${tenant_id}' AND org_id = '${org_id}'`)
        let removeAttr = await this.dataSource.getRepository(Attribute).find({
            where: {
                attribute_group_id: attributeGroupId,
                attribute_name: In(variation_attributes),
                tenant_id: tenant_id,
                org_id: org_id
            }, 
            select: ['id']
        })    
        let ignoreAttributesIds = removeAttr.map(x => x.id)  
        
        const coreAttributes = await this.dataSource.getRepository(CoreAttribute).find({
            where: {
                attribute_name: In(data.map(x => x['Core Attribute Name']))
            },
            select: ['attribute_name', 'id']
        })

        const tenantAttributes = await this.dataSource.getRepository(Attribute).find({
            where: {
                attribute_name: In(data.map(x => x['Tenant Attribute Name'])),
                // attribute_group_id: Not(attributeGroupId),
                id: Not(In(ignoreAttributesIds)),   
                tenant_id: tenant_id,
                org_id: org_id
            },
            select: ['attribute_name', 'id']
        })

        const coreCategories = await this.dataSource.getRepository(CoreCategory).find({
            where: {
                category_path: In(data.map(x => x['Core Category Path']))
            },
            select: ['category_path', 'id']
        })

        const channelCategories = await this.dataSource.getRepository(TenantCategoryPath).find({
            where: {
                path: In(data.map(x => x['Tenant Category Path'])),
                tenant_id: tenant_id,
                org_id: org_id
            },
            select: ['path', 'id']
        })

        let entityManager = this.dataSource.createEntityManager()
        let i = 0
        for (let row of data) {
            console.log(i);
            i++;
            try {
                let errors = []
                if (row['Core Attribute Name'] === null || row  ['Tenant Attribute Name'] === null || row['Core Category Path'] === null || row['Tenant Category Path'] === null) {
                    errors.push(`One of the field is Empty`)
                }

                const coreAttribute = coreAttributes.find(x => x.attribute_name === row['Core Attribute Name'])
                const tenantAttribute = tenantAttributes.find(x => x.attribute_name === row['Tenant Attribute Name'])//row['Channel Attribute Name']
                const coreCategory = coreCategories.find(x => x.category_path === row['Core Category Path'])
                const tenantCategory = channelCategories.find(x => x.path === row['Tenant Category Path'])

                if (coreAttribute === undefined)
                    errors.push(`Core Attribute ${row['Core Attribute Name']} does not exist`)
                if (tenantAttribute === undefined)
                    errors.push(`Tenant Attribute ${row['Tenant Attribute Name']} does not exist`)
                if (coreCategory === undefined)
                    errors.push(`Core Category ${row['Core Category Path']} does not exist`)
                if (tenantCategory === undefined)
                    errors.push(`Tenant Category ${row['Tenant Category Path']} does not exist`)

                if (errors.length != 0) {
                    failedRows.push({
                        ...row,
                        error: errors.join(',')
                    })
                    continue
                }

                //Chacking for Assignments
                // const coreAssignment = await entityManager.getRepository(CoreCategoryAssignment).findOne({
                //     where:{
                //         category_id:coreCategory.id,
                //         attribute_id:coreAttribute.id
                //     }
                // })
                // if(coreAssignment===undefined || coreAssignment===null)
                //     errors.push(`Core Assignment ${coreCategory.category_path} <--> ${coreAttribute.attribute_name} does not exist`)

                // const tenantAssignment = await entityManager.getRepository(TenantCategoryAssignment).findOne({
                //     where:{
                //         category_id:coreCategory.id,
                //         attribute_id:coreAttribute.id,
                //         tenant_id:tenant_id,
                //         org_id:org_id
                //     }
                // })
                // if(tenantAssignment===undefined || tenantAssignment===null)
                //     errors.push(`Tenant Assignment ${tenantCategory.path} <--> ${tenantAttribute.attribute_name} does not exist`)

                await entityManager
                    .createQueryBuilder()
                    .insert()
                    .into(CoreTenantAttributeMappings)
                    .values({
                        core_attribute_id: coreAttribute.id,
                        tenant_attribute_id: tenantAttribute.id,
                        core_category_id: coreCategory.id,
                        tenant_category_id: tenantCategory.id,
                        tenant_id: tenant_id,
                        org_id: org_id
                    })
                    .orIgnore()
                    .execute()  
            }
            catch (e) {
                failedRows.push({
                    ...row,
                    error: e.message
                })
            }
        }

        fs.writeFileSync('core_tenant_attribute_mapping_failed.json', JSON.stringify(failedRows, null, 2), 'utf-8');
        console.log("JSON file created successfully!");


    }

}
