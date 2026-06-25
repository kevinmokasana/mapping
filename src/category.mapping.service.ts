import { HttpException, Injectable } from '@nestjs/common';
import { BulkUploadCategoryJsonData, BulkUploadCatMappingJSONData, MetaData } from './dto';
import * as fs from 'fs'
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { ChannelCategory, CoreCategory, CoreChannelCategoryMapping, CoreTenantCategoryMapping, TenantCategoryPath } from './tables.entity';
import { WRITE_DB_NAME } from './app.constants';
@Injectable()
export class CategoryMappingService {

  constructor(
    @InjectDataSource(WRITE_DB_NAME) private dataSource: DataSource

  ) { }

  async coreChannelCatMapping(channelId: number) {
    try {
      let fileName = `CoreChannelCatMapping.json`
      let jsonData: BulkUploadCatMappingJSONData[] = JSON.parse(fs.readFileSync(fileName).toString())
      let data = jsonData
      // console.log(data);
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
      const failedRows: any[] = [];
      await this.dataSource.transaction(async (entityManager) => {
        for (const row of data) {
          console.log(row);
          try {
            let errors = []

            if(row['Core Category Path'] == undefined || row['Core Category Path'] == null) {
              errors.push('Core category not found')
            }
            if(row['Channel Category Path'] == undefined || row['Channel Category Path'] == null) {
              errors.push('Channel category not found')
            }

            if(errors.length>0){
              failedRows.push({
                ...row,
                errors
              })
              continue
            }
            let coreCategoryId = coreCategories.find(x => x.category_path === row['Core Category Path'])
            let channelCategoryId = channelCategories.find(x => x.category_path === row['Channel Category Path'])

            if (coreCategoryId == undefined || coreCategoryId == null)
              errors.push('Core category not found')
            if (channelCategoryId == undefined || channelCategoryId == null)
              errors.push('Channel category not found')

            if (errors.length > 0) {
              failedRows.push({
                ...row,
                errors
              })
              continue
            }

            const data = await entityManager
              .createQueryBuilder()
              .insert()
              .into(CoreChannelCategoryMapping)
              .values({
                core_category_id: coreCategoryId.id,
                channel_category_id: channelCategoryId.id,
                channel_id: channelId,
              })
              .orIgnore() // translates to ON CONFLICT DO NOTHING
              .execute();
          }
          catch (e) {
            console.log(e)
            failedRows.push({
              ...row,
              error: e.message
            })
          }
        }

      })
      fs.writeFileSync('coreChannelCatMappingFailedRows.json', JSON.stringify(failedRows, null, 2))

    } catch (e) {
      console.log(e)
      throw new HttpException(e.message, 201)
    }
  }

  async coreTenantCatMapping(tenant_id: string, org_id: string) {
    try {
      let fileName = `CoreTenantCatMapping.json`
      let jsonData: BulkUploadCatMappingJSONData[] = JSON.parse(fs.readFileSync(fileName).toString())
      let data = jsonData
      // console.log(data);
      const coreCategoryIds = [...new Set(data.map(row => row['Core Category Path']))];
      const coreCategories = await this.dataSource.getRepository(CoreCategory).find({
        where: { category_path: In(coreCategoryIds) },
        select: ['category_path', 'id'],
      });

      // 2. Bulk load tenant categories
      const tenantCategoryPaths = [...new Set(data.map(row => row['Tenant Category Path']))];
      const tenantCategories = await this.dataSource.getRepository(TenantCategoryPath).find({
        where: { path: In(tenantCategoryPaths), tenant_id, org_id },
        select: ['path', 'id'],
      });
      const failedRows: any[] = [];
      await this.dataSource.transaction(async (entityManager) => {
        // 1. Bulk load core categories

        for (const row of data) {
          let errors = []

          if (row['Core Category Path'] == undefined || row['Core Category Path'] == null) {
            errors.push('Core category not found')
          }
          if (row['Tenant Category Path'] == undefined || row['Tenant Category Path'] == null) {
            errors.push('Tenant category not found')
          }

          if(errors.length>0 ){
            failedRows.push({
              ...row,
              errors
            })
            continue
          }
          let tenantCategory = tenantCategories.find(x => x.path === row['Tenant Category Path'])
          let coreCategory = coreCategories.find(x => x.category_path === row['Core Category Path'])
          if (tenantCategory == undefined || tenantCategory == null) {
            errors.push('Tenant category not found')
          }
          if (coreCategory == undefined || coreCategory == null) {
            errors.push('Core category not found')
          }
          if (errors.length > 0) {
            failedRows.push({
              ...row,
              errors
            })
            continue
          }
          // 4. Insert into mapping
          const data = await entityManager
            .createQueryBuilder()
            .insert()
            .into(CoreTenantCategoryMapping)
            .values({
              core_category_id: coreCategory.id,
              tenant_category_id: tenantCategory.id,
              tenant_id: tenant_id,
              org_id: org_id
            })
            .orIgnore() // translates to ON CONFLICT DO NOTHING
            .execute();
        }

      })
      fs.writeFileSync('coreTenantCatMappingFailedRows.json', JSON.stringify(failedRows, null, 2))


    }
    catch (e) {
      console.log(e)
      throw new HttpException(e.message, 201)
    }
  }
}
