import { HttpException, Injectable } from '@nestjs/common';
import { BulkUploadCategoryJsonData, bulkUploadCatMappingJSONData, MetaData } from './dto';
import * as fs from 'fs'
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { ChannelCategory, CoreCategory, CoreChannelCategoryMapping, TenantCategoryPath } from './tables.entity';
import { WRITE_DB_NAME } from './app.constants';
@Injectable()
export class CategoryMappingService {

    constructor(
        @InjectDataSource(WRITE_DB_NAME) private dataSource:DataSource

    ){}

    async coreChannelCatMapping(channelId:number) {  
        try {
            let fileName = `CoreChannelCatMapping.json`
            let jsonData:bulkUploadCatMappingJSONData[] = JSON.parse(fs.readFileSync(fileName).toString())
            let data = jsonData
            console.log(data);
            
            const failedRows: any[] = [];
            await this.dataSource.transaction(async (entityManager) => {
                for (const row of data) {
                    const {
                      'Core Category Path': corePath,
                      'Channel Category Path': channelPath,
                    } = row;
              
                    // 1. Lookup core category
                    const coreCategory = await entityManager.getRepository(CoreCategory).findOne({
                      where: { category_path: corePath },
                    });
              
                    // 2. Lookup channel category
                    const channelCategory = await entityManager.getRepository(ChannelCategory).findOne({
                      where: { category_path: channelPath, channel_id: channelId },
                    });
              
                    // 3. Handle failures
                    if (!coreCategory || !channelCategory) {
                      failedRows.push({
                        ...row,
                        error: !coreCategory
                          ? 'Core category not found'
                          : 'Channel category not found',
                      });
                      continue;
                    }
              
                    // 4. Insert into mapping
                    await entityManager.getRepository(CoreChannelCategoryMapping).save({
                      core_category_id: coreCategory.id,
                      channel_category_id: channelCategory.id,
                    });
                }

            })
    

        } catch (e) {
            console.log(e)
            throw new HttpException(e.message, 201)
        }
    }
    
    async coreTenantCatMapping(tenant_id: string, org_id: string) {
      try{
            let fileName = `CoreTenantCatMapping.json`
            let jsonData:bulkUploadCatMappingJSONData[] = JSON.parse(fs.readFileSync(fileName).toString())
            let data = jsonData
            console.log(data);
            
            const failedRows: any[] = [];
            await this.dataSource.transaction(async (entityManager) => {
                for (const row of data) {
                    const {
                      'Core Category Path': corePath,
                      'Channel Category Path': channelPath,
                    } = row;
              
                    // 1. Lookup core category
                    const coreCategory = await entityManager.getRepository(CoreCategory).findOne({
                      where: { category_path: corePath },
                    });
              
                    // 2. Lookup channel category
                    const tenantCategory = await entityManager.getRepository(TenantCategoryPath).findOne({
                      where: { category_path: channelPath, tenant_id: tenant_id, org_id: org_id },
                    });
              
                    // 3. Handle failures
                    if (!coreCategory || !tenantCategory) {
                      failedRows.push({
                        ...row,
                        error: !coreCategory
                          ? 'Core category not found'
                          : 'Tenant category not found',
                      });
                      continue;
                    }
              
                    // 4. Insert into mapping
                    await entityManager.getRepository(CoreChannelCategoryMapping).save({
                      core_category_id: coreCategory.id,
                      channel_category_id: tenantCategory.id,
                    });
                }

            })
      }
      catch(e){
        console.log(e)
        throw new HttpException(e.message, 201)
      }
    }
}
