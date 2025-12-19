import { HttpException, Injectable } from '@nestjs/common';
import {
  BulkUploadAttributeJSONData,
  BulkUploadCategoryJsonData,
  MetaData,
} from './dto';
import * as fs from 'fs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  ChannelAttribute,
  ChannelCategory,
  ChannelReferenceAttributes,
  ChannelReferenceMaster,
  ChannelRefereneData,
  CoreAttribute,
  CoreCategory,
  CoreReferenceAttributes,
  CoreReferenceMaster,
  CoreRefereneData,
} from './tables.entity';
import * as dotenv from 'dotenv';
import { WRITE_DB_NAME } from './app.constants';
dotenv.config();
@Injectable()
export class LovCreation {
  constructor(
    @InjectDataSource(WRITE_DB_NAME) private dataSource: DataSource,
  ) {}

  async createChannelReferenceMaster(channel_id: number) {
    try {
      let fileName = `ChannelReferenceMasterData.json`;
      let data: any[] = JSON.parse(
        fs.readFileSync(fileName).toString(),
      );
      // let data = jsonData

      const failedRows: any[] = [];

      let entityManager = this.dataSource.createEntityManager();

      const channelAttributes = await this.dataSource
        .getRepository(ChannelAttribute)
        .find({
          where: {
            attribute_name: In(data.map((x) => x['Channel Attribute Name'])),
            channel_id: channel_id,
          },
          select: ['attribute_name', 'id'],
        });

      const channelCategories = await this.dataSource
        .getRepository(ChannelCategory)
        .find({
          where: {
            category_path: In(data.map((x) => x['Channel Category Path'])),
            channel_id: channel_id,
          },
          select: ['category_path', 'id'],
        });
      let i=0
      for (let row of data) {
        i++
        console.log(i);
        
        const channelAttribute = channelAttributes.find(
          (x) => x.attribute_name === row['Channel Attribute Name'],
        );
        const channelCategory = channelCategories.find(
          (x) => x.category_path === row['Channel Category Path'],
        );
        let errors = [];
        if (channelAttribute === undefined)
          errors.push({
            ...row,
            error: `Channel Attribute ${row['Channel Attribute Name']} does not exist`,
          });

        if (channelCategory === undefined)
          errors.push({
            ...row,
            error: `Channel Category ${row['Channel Category Path']} does not exist`,
          });

        if (errors.length > 0) {
          failedRows.push(...errors);
          continue;
        }

        const channel_rmdm_id = await entityManager.getRepository(ChannelRefereneData).findOne({
          where: {
            attribute_id: channelAttribute.id,  
            value: row['Value'],
            category_id: channelCategory.id,
            channel_id: channel_id,
          },
          select: ['rmdm_id'],
        });

        if (channel_rmdm_id !== null && channel_rmdm_id !== undefined){
          errors.push({
            ...row,
            error: `Channel Reference Data ${row['Channel Reference Data']} already exist for Channel Attribute ${row['Channel Attribute Name']} and Channel Category ${row['Channel Category Name']}`,
          });
          continue
        }

        // if (errors.length > 0) {
        //   failedRows.push(...errors);
        //   continue;
        // }
        const time = Date.now();
        await entityManager
          .createQueryBuilder()
          .insert()
          .into(ChannelRefereneData)
          .values({
            attribute_id: channelAttribute.id,
            category_id: channelCategory.id,
            value: row['Value'],
            channel_id: channel_id,
          })
          .orIgnore()
          .execute();
      }
      fs.writeFileSync('channel_lov_creation_failed.json', JSON.stringify(failedRows, null, 2), 'utf-8');
      console.log("JSON file created successfully!");
    } catch (err) {
      throw new HttpException(err.message, 500);
    }
  }


  async createCoreReferenceMaster() {
    try {
      let fileName = `CoreReferenceMasterData.json`;
      let data: any[] = JSON.parse(
        fs.readFileSync(fileName).toString(),
      );
      // let data = jsonData

      const failedRows: any[] = [];

      let entityManager = this.dataSource.createEntityManager();

      const coreAttributes = await this.dataSource
        .getRepository(CoreAttribute)
        .find({
          where: {
            attribute_name: In(data.map((x) => x['Core Attribute Name'])),
          },
          select: ['attribute_name', 'id'],
        });
      let i=0;
      for (let row of data) {
        i++;
        console.log(i);
        
        const coreAttribute = coreAttributes.find(
          (x) => x.attribute_name === row['Core Attribute Name'],
        );
        let errors = [];
        if (coreAttribute === undefined)
          errors.push({
            ...row,
            error: `Core Attribute ${row['Core Attribute Name']} does not exist`,
          });

        if (errors.length > 0) {
          failedRows.push(...errors);
          continue;
        }

        const core_rmdm_id = await entityManager.getRepository(CoreRefereneData).findOne({
          where: {
            attribute_id: coreAttribute.id,
            value: row['Core Reference Data'],
          },
          select: ['rmdm_id'],
        });
        console.log(core_rmdm_id);
        // break
        
        if (core_rmdm_id !== null && core_rmdm_id !== undefined){
          // errors.push({
          //   ...row,
          //   error: `Core Reference Data ${row['Core Reference Data']} already exist for Core Attribute ${row['Core Attribute Name']}`,
          // });
          continue
        }
        
        // if (errors.length > 0) {
        //   failedRows.push(...errors);
        //   continue;
        // }
        const time = Date.now();
        await entityManager
          .createQueryBuilder()
          .insert()
          .into(CoreRefereneData)
          .values({
            attribute_id: coreAttribute.id,
            value: row['Core Reference Data'],
            status: true,
            created_by: 'Admin',
            // created_at: time,
            updated_by: 'Admin',
            // updated_at: time,
          })
          .orIgnore()
          .execute();
      }
      fs.writeFileSync('core_lov_creation_failed.json', JSON.stringify(failedRows, null, 2), 'utf-8');
      console.log("JSON file created successfully!");

    } catch (err) {
      throw new HttpException(err.message, 500);
    }
  }
}
