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
export class AttributeCreation {

    constructor(
        @InjectDataSource(WRITE_DB_NAME) private dataSource:DataSource
    ){}


   async bulkUploadAttribute(type:`Core`|`Channel`, channelId?:number){
    try{
        let fileName = type===`Core`?`CoreAttribute.json`:`ChannelAttribute.json`
        let jsonData:BulkUploadAttributeJSONData[] = JSON.parse(fs.readFileSync(fileName).toString())
        let data = jsonData
        const failedRows: any[] = [];
        let Attribute = type===`Core` ? CoreAttribute : ChannelAttribute
        let ReferenceMaster = type===`Core` ? CoreReferenceMaster : ChannelReferenceMaster
        let ReferenceAttributes = type===`Core` ? CoreReferenceAttributes : ChannelReferenceAttributes
        await this.dataSource.transaction(async (entityManager) => {
            for (const row of data) {
                try {
                  // 🔍 Step 0: Check if attribute already exists
                  const existingAttr = await entityManager.getRepository(Attribute).findOne({
                    where: { attribute_name: row.attribute_name, ...(type === 'Core' ? {} : { channel_id: channelId }) },
                  });
          
                  if (existingAttr) {
                    failedRows.push({
                      ...row,
                      error: `Attribute "${row.attribute_name}" already exists`,
                    });
                    continue; // skip to next row
                  }
                  
                  let referenceMasterId: number = null;
                  let referenceAttributeId: number = null;
          
                  if (row.constraint) {
                    // Step 1: Find or create Reference Master
                    let master = await entityManager.getRepository(ReferenceMaster).findOne({
                      where: { master_entity_name: row.reference_master_name, ...(type === 'Core' ? {} : { channel_id: channelId }) },
                    });
          
                    if (!master) {
                      master = await entityManager.getRepository(ReferenceMaster).save({
                        master_entity_name: row.reference_master_name,
                        master_entity_type: 'reference_master',
                        status: true,
                        created_by: 'Admin',
                        updated_by: 'Admin',
                        ...(type === 'Core' ? {} : { channel_id: channelId })
                      });
                    }
                    referenceMasterId = master.id;
          
                    // Step 2: Find or create Reference Attribute
                    let refAttr = await entityManager.getRepository(ReferenceAttributes).findOne({
                      where: {
                        attribute_name: row.reference_attribute_name,
                        reference_master_id: referenceMasterId,
                        ...(type === 'Core' ? {} : { channel_id: channelId })
                      },
                    });
          
                    if (!refAttr) {
                      refAttr = await entityManager.getRepository(ReferenceAttributes).save({
                        attribute_db_name: row.reference_attribute_name,
                        attribute_name: row.reference_attribute_name,
                        short_name: row.reference_attribute_name,
                        display_name: row.reference_attribute_name,
                        attribute_type: row.attribute_type,
                        length: row.length,
                        mandatory: row.mandatory,
                        unique: row.unique,
                        filter: row.filter,
                        editable: row.editable,
                        visibility: row.visibility,
                        searchable: row.searchable,
                        reference_master_id: referenceMasterId,
                        status: true,
                        created_by: 'Admin',
                        updated_by: 'Admin',
                        ...(type === 'Core' ? {} : { channel_id: channelId })
                      });
                    }
                    referenceAttributeId = refAttr.id;
                  }
          
                  // Step 3: Insert Attribute
                  await entityManager.getRepository(Attribute).save({
                    attribute_db_name: row.attribute_db_name,
                    attribute_name: row.attribute_name,
                    short_name: row.attribute_name,
                    display_name: row.attribute_name,
                    label_description: row.label_description ?? null,
                    attribute_type: row.attribute_type,
                    attribute_data_type: row.attribute_data_type,
                    length: row.length,
                    mandatory: row.mandatory,
                    filter: row.filter,
                    editable: row.editable,
                    visibility: row.visibility,
                    searchable: row.searchable,
                    constraint: row.constraint,
                    reference_master_id: referenceMasterId,
                    reference_attribute_id: referenceAttributeId,
                    status: true,
                    created_by: 'Admin',
                    updated_by: 'Admin',
                    ...(type === 'Core' ? {} : { channel_id: channelId })
                  });
                } catch (err) {
                  failedRows.push({ ...row, error: err.message });
                }
              }
          
              if (failedRows.length > 0) {
                fs.writeFileSync('attribute_failed.json', JSON.stringify(failedRows, null, 2), 'utf-8');
                console.log("JSON file created successfully!");
                return { message: 'Some rows failed', failed: failedRows };
              }
              
              return { message: 'All attributes processed successfully' };
        })
    } catch (err) {
        console.log(err.message);
        throw new HttpException(`Something went wrong in bulk upload attribute service`, 500);
    }
   }

//    async bulkUploadChannelAttribute(type:`Core`|`Channel`, channelId?:number){
//     try{
//         let fileName = `ChannelAttribute.json`
//         let jsonData:BulkUploadAttributeJSONData[] = JSON.parse(fs.readFileSync(fileName).toString())
//         let data = jsonData
//         const failedRows: any[] = [];
//         let Attribute = type===`Core` ? CoreAttribute : ChannelAttribute
//         let ReferenceMaster = type===`Core` ? CoreReferenceMaster : ChannelReferenceMaster
//         let ReferenceAttributes = type===`Core` ? CoreReferenceAttributes : ChannelReferenceAttributes

//         await this.dataSource.transaction(async (entityManager) => {
//             for (const row of data) {
//                 try {
//                   // 🔍 Step 0: Check if attribute already exists
//                   const existingAttr = await entityManager.getRepository(ChannelAttribute).findOne({
//                     where: { attribute_name: row.attribute_name, channel_id: channelId },
//                   });
          
//                   if (existingAttr) {
//                     failedRows.push({
//                       ...row,
//                       error: `Attribute "${row.attribute_name}" already exists`,
//                     });
//                     continue; // skip to next row
//                   }
          
//                   let referenceMasterId: number = null;
//                   let referenceAttributeId: number = null;
          
//                   if (row.constraint) {
//                     // Step 1: Find or create Reference Master
//                     let master = await entityManager.getRepository(ChannelReferenceMaster).findOne({
//                       where: { master_entity_name: row.reference_master_name, channel_id: channelId },
//                     });
          
//                     if (!master) {
//                       master = await entityManager.getRepository(ChannelReferenceMaster).save({
//                         master_entity_name: row.reference_master_name,
//                         master_entity_type: 'reference_master',
//                         status: true,
//                         created_by: 'Admin',
//                         updated_by: 'Admin',
//                       });
//                     }
//                     referenceMasterId = master.id;
          
//                     // Step 2: Find or create Reference Attribute
//                     let refAttr = await entityManager.getRepository(ChannelReferenceAttributes).findOne({
//                       where: {
//                         attribute_name: row.reference_attribute_name,
//                         reference_master_id: referenceMasterId,
//                       },
//                     });
          
//                     if (!refAttr) {
//                       refAttr = await entityManager.getRepository(ChannelReferenceAttributes).save({
//                         attribute_db_name: row.reference_attribute_name,
//                         attribute_name: row.reference_attribute_name,
//                         short_name: row.reference_attribute_name,
//                         display_name: row.reference_attribute_name,
//                         attribute_type: row.attribute_type,
//                         length: row.length,
//                         mandatory: row.mandatory,
//                         unique: row.unique,
//                         filter: row.filter,
//                         editable: row.editable,
//                         visibility: row.visibility,
//                         searchable: row.searchable,
//                         reference_master_id: referenceMasterId,
//                         status: true,
//                         created_by: 'Admin',
//                         updated_by: 'Admin',
//                       });
//                     }
//                     referenceAttributeId = refAttr.id;
//                   }
          
//                   // Step 3: Insert Attribute
//                   await entityManager.getRepository(ChannelAttribute).save({
//                     attribute_db_name: row.attribute_db_name,
//                     attribute_name: row.attribute_name,
//                     short_name: row.attribute_name,
//                     display_name: row.attribute_name,
//                     label_description: row.label_description ?? null,
//                     attribute_type: row.attribute_type,
//                     attribute_data_type: row.attribute_data_type,
//                     length: row.length,
//                     mandatory: row.mandatory,
//                     filter: row.filter,
//                     editable: row.editable,
//                     visibility: row.visibility,
//                     searchable: row.searchable,
//                     constraint: row.constraint,
//                     reference_master_id: referenceMasterId,
//                     reference_attribute_id: referenceAttributeId,
//                     status: row.status,
//                     created_by: 'Admin',
//                     updated_by: 'Admin',
//                   });
//                 } catch (err) {
//                   failedRows.push({ ...row, error: err.message });
//                 }
//               }
          
//               if (failedRows.length > 0) {
//                 return { message: 'Some rows failed', failed: failedRows };
//               }
          
//               return { message: 'All attributes processed successfully' };
//         })
//     } catch (err) {
//         console.log(err.message);
//         throw new HttpException(`Something went wrong in bulk upload attribute service`, 500);
//     }
//    }

}
