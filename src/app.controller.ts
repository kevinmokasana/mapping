import { Body, Controller, Get, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { CategoryCreation } from './category.creation.service';
import { ExcelToJson } from './exceltojson.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CategoryMappingService } from './category.mapping.service';
import { AttributeCreation } from './attribute.creation.service';


@Controller()
export class AppController {
    constructor(
        private readonly attributeCreation: AttributeCreation,
        private readonly categoryCreation: CategoryCreation,
        private readonly excelToJson: ExcelToJson,
        private readonly categoryMappingService: CategoryMappingService
    ) {}

    @Post('core-creation')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'core', maxCount: 1 },
    ]))
    async coreCreation(@UploadedFiles() files: { products: Express.Multer.File[]}){
        
    }

    @Post('core-channel-cat-mapping')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'core_channel_cat_map', maxCount: 1 },
    ]))
    async coreChannelCatMapping(@Body() body:{channel_id:number}, @UploadedFiles() files: { 'core_channel_cat_map': Express.Multer.File[]}){
        console.log(files);
        
        await this.excelToJson.excelToJson(files['core_channel_cat_map'])
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
        await this.excelToJson.excelToJson(files['channel_attributes'])
        await this.attributeCreation.bulkUploadAttribute('Channel', body.channel_id)    
    }  
}
