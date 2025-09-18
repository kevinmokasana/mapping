import { Body, Controller, Get, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { CategoryCreation } from './category.creation.service';
import { ExcelToJson } from './exceltojson.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CategoryMappingService } from './category.mapping.service';


@Controller()
export class AppController {
    constructor(
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

    @Post('attribute-creation')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'attributes', maxCount: 1 },
    ]))
    async attributeCreation(@UploadedFiles() files: { attributes: Express.Multer.File[]}){
        await this.excelToJson.excelToJson(files['attributes'])
        
    }

        

  
}
