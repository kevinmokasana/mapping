import { Body, Controller, Get, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { CategoryCreation } from './category.creation.service';
import { ExcelToJson } from './exceltojson.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CategoryMappingService } from './category.mapping.service';
import { AttributeCreation } from './attribute.creation.service';
import { AttributeMappingService } from './attribute.mapping.service';
import { LovCreation } from './lov.creation.service';
import { LovMappingService } from './lov.mapping.service';
import { channel } from 'diagnostics_channel';


@Controller()
export class AppController {
    constructor(
        private readonly attributeCreation: AttributeCreation,
        private readonly categoryCreation: CategoryCreation,
        private readonly excelToJson: ExcelToJson,
        private readonly categoryMappingService: CategoryMappingService,
        private readonly attributeMappingService: AttributeMappingService,
        private readonly lovCreation: LovCreation,
        private readonly lovMappingService: LovMappingService,
    ) {}

    @Post('core-creation')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'core', maxCount: 1 },
    ]))
    async coreCreation(@UploadedFiles() files: { core: Express.Multer.File[]}){
        // console.log(files)
        await this.excelToJson.excelToJson(files.core)
        await this.categoryCreation.bulkUploadCategory('core')
    }

    @Post('channel-creation')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'channel', maxCount: 1 },
    ]))
    async channelCreation(@Body() body:{channel_id:number}, @UploadedFiles() files: { channel: Express.Multer.File[]}){
        // console.log(files)
        await this.excelToJson.excelToJson(files.channel)
        console.log(body.channel_id);
        
        await this.categoryCreation.bulkUploadCategory('channel', body.channel_id)
    }

    @Post('core-channel-cat-mapping')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'core_channel_cat_map', maxCount: 1 },
    ]))
    async coreChannelCatMapping(@Body() body:{channel_id:number}, @UploadedFiles() files: { 'core_channel_cat_map': Express.Multer.File[]}){
        console.log(files);
        
        await this.excelToJson.excelToJson(files['core_channel_cat_map'])
        console.log(body.channel_id);
        
        await this.categoryMappingService.coreChannelCatMapping(body.channel_id)
    }

    @Post('core-tenant-cat-mapping')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'core_tenant_cat_map', maxCount: 1 },
    ]))
    async coreTenantCatMapping(@Body() body:{tenant_id:string, org_id:string}, @UploadedFiles() files: { 'core_tenant_cat_map': Express.Multer.File[]}){
        console.log(files);
        
        await this.excelToJson.excelToJson(files['core_tenant_cat_map'])
        await this.categoryMappingService.coreTenantCatMapping(body.tenant_id, body.org_id)
    }

    @Post('core-attribute-creation')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'core_attributes', maxCount: 1 },
    ]))
    async bulkAttributeCreation(@UploadedFiles() files: { 'core_attributes': Express.Multer.File[]}){
        await this.excelToJson.excelToJson(files['core_attributes'])
        await this.attributeCreation.bulkUploadAttribute('Core')
    }

    @Post('channel-attribute-creation')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'channel_attributes', maxCount: 1 },
    ]))
    async bulkChannelAttributeCreation(@Body() body:{channel_id:number}, @UploadedFiles() files: { 'channel_attributes': Express.Multer.File[]}){
        console.log(`here`)
        try{
            await this.excelToJson.excelToJson(files['channel_attributes'])
            await this.attributeCreation.bulkUploadAttribute('Channel', body.channel_id)    
        }catch(e){
            console.log(e)
        }
    }  

    @Post('core-channel-attribute-mapping')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'core_channel_attribute_mapping', maxCount: 1 },
    ]))
    async bulkCoreChannelAttributeMapping(@Body() body:{channel_id:number}, @UploadedFiles() files: { 'core_channel_attribute_mapping': Express.Multer.File[]}){
        await this.excelToJson.excelToJson(files['core_channel_attribute_mapping'])
        await this.attributeMappingService.coreChannleAttributeMapping(body.channel_id)    
    }  

    @Post('core-tenant-attribute-mapping')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'core_tenant_attribute_mapping', maxCount: 1 },
    ]))
    async coreTenantAttributeMapping(@Body() body:{tenant_id:string, org_id: string}, @UploadedFiles() files: { 'core_tenant_attribute_mapping': Express.Multer.File[]}){
        await this.excelToJson.excelToJson(files['core_tenant_attribute_mapping'])
        await this.attributeMappingService.coreTenantAttributeMapping(body.tenant_id, body.org_id)    
    }  

    @Post('core-reference-data-creation')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'core_reference_data_creation', maxCount: 1 },
    ]))
    async coreReferenceDataCreation(@Body() body:{}, @UploadedFiles() files: { 'core_reference_data_creation': Express.Multer.File[]}){
        await this.excelToJson.excelToJson(files['core_reference_data_creation'])
        await this.lovCreation.createCoreReferenceMaster()    
    } 

    @Post('channel-reference-data-creation')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'channel_reference_data_creation', maxCount: 1 },
    ]))
    async channelReferenceDataCreation(@Body() body:{channel_id: number}, @UploadedFiles() files: { 'channel_reference_data_creation': Express.Multer.File[]}){
        await this.excelToJson.excelToJson(files['channel_reference_data_creation'])
        await this.lovCreation.createChannelReferenceMaster(body.channel_id)    
    } 

    @Post('core-channel-lov-mapping')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'core_channel_lov_mapping', maxCount: 1 },
    ]))
    async coreChannelLovMapping(@Body() body:{channel_id:number}, @UploadedFiles() files: { 'core_channel_lov_mapping': Express.Multer.File[]}){
        await this.excelToJson.excelToJson(files['core_channel_lov_mapping'])
        await this.lovMappingService.coreChnanelLovMapping(body.channel_id)    
    }  

    @Post('core-tenant-lov-mapping')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'core_tenant_lov_mapping', maxCount: 1 },
    ]))
    async coreTenantLovMapping(@Body() body:{tenant_id:string, org_id:string}, @UploadedFiles() files: { 'core_tenant_lov_mapping': Express.Multer.File[]}){
        await this.excelToJson.excelToJson(files['core_tenant_lov_mapping'])
        await this.lovMappingService.coreTenantLovMapping(body.tenant_id, body.org_id)    
    }
    
}
