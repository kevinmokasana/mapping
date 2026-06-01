import { Body, Controller, Get, Post, UploadedFiles, UseInterceptors, Res } from '@nestjs/common';
import { CategoryCreation } from './category.creation.service';
import { ExcelToJson } from './exceltojson.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CategoryMappingService } from './category.mapping.service';
import { AttributeCreation } from './attribute.creation.service';
import { AttributeMappingService } from './attribute.mapping.service';
import { LovCreation } from './lov.creation.service';
import { LovMappingService } from './lov.mapping.service';
import { Response } from 'express';
// import { channel } from 'diagnostics_channel';


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
    ) { }

    @Post('core-creation')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'file', maxCount: 1 },
    ]))
    async coreCreation(@UploadedFiles() files: { 'file': Express.Multer.File[] }) {
        await this.excelToJson.validateExcelHeaders(files['file'], 'core-creation')
        await this.excelToJson.excelToJson(files['file'])
        await this.categoryCreation.bulkUploadCategory('core')
    }

    @Post('channel-creation')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'file', maxCount: 1 },
    ]))
    async channelCreation(@Body() body: { channel_id: number }, @UploadedFiles() files: { 'file': Express.Multer.File[] }) {
        await this.excelToJson.validateExcelHeaders(files['file'], 'channel-creation')
        await this.excelToJson.excelToJson(files['file'])
        await this.categoryCreation.bulkUploadCategory('channel', body.channel_id)
    }

    @Post('core-channel-cat-mapping')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'file', maxCount: 1 },
    ]))
    async coreChannelCatMapping(@Body() body: { channel_id: number }, @UploadedFiles() files: { 'file': Express.Multer.File[] }) {

        await this.excelToJson.validateExcelHeaders(files['file'], 'core-channel-cat-mapping')
        await this.excelToJson.excelToJson(files['file'])
        await this.categoryMappingService.coreChannelCatMapping(body.channel_id)
    }

    @Post('core-tenant-cat-mapping')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'file', maxCount: 1 },
    ]))
    async coreTenantCatMapping(@Body() body: { tenant_id: string, org_id: string }, @UploadedFiles() files: { 'file': Express.Multer.File[] }) {
        console.log(files);

        await this.excelToJson.validateExcelHeaders(files['file'], 'core-tenant-cat-mapping')
        await this.excelToJson.excelToJson(files['file'])
        await this.categoryMappingService.coreTenantCatMapping(body.tenant_id, body.org_id)
    }

    @Post('core-attribute-creation')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'file', maxCount: 1 },
    ]))
    async bulkAttributeCreation(@UploadedFiles() files: { 'file': Express.Multer.File[] }) {
        await this.excelToJson.validateExcelHeaders(files['file'], 'core-attribute-creation')
        await this.excelToJson.excelToJson(files['file'])
        await this.attributeCreation.bulkUploadAttribute('Core')
    }

    @Post('channel-attribute-creation')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'file', maxCount: 1 },
    ]))
    async bulkChannelAttributeCreation(@Body() body: { channel_id: number }, @UploadedFiles() files: { 'file': Express.Multer.File[] }) {
        console.log(`here`)
        try {
            await this.excelToJson.validateExcelHeaders(files['file'], 'channel-attribute-creation')
            await this.excelToJson.excelToJson(files['file'])
            await this.attributeCreation.bulkUploadAttribute('Channel', body.channel_id)
        } catch (e) {
            console.log(e)
        }
    }

    @Post('core-channel-attribute-mapping')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'file', maxCount: 1 },
    ]))
    async bulkCoreChannelAttributeMapping(@Body() body: { channel_id: number }, @UploadedFiles() files: { 'file': Express.Multer.File[] }) {
        await this.excelToJson.validateExcelHeaders(files['file'], 'core-channel-attribute-mapping')
        await this.excelToJson.excelToJson(files['file'])
        await this.attributeMappingService.coreChannleAttributeMapping(body.channel_id)
    }

    @Post('core-tenant-attribute-mapping')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'file', maxCount: 1 },
    ]))
    async coreTenantAttributeMapping(@Body() body: { tenant_id: string, org_id: string }, @UploadedFiles() files: { 'file': Express.Multer.File[] }) {
        await this.excelToJson.validateExcelHeaders(files['file'], 'core-tenant-attribute-mapping')
        await this.excelToJson.excelToJson(files['file'])
        await this.attributeMappingService.coreTenantAttributeMapping(body.tenant_id, body.org_id)
    }

    @Post('core-reference-data-creation')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'file', maxCount: 1 },
    ]))
    async coreReferenceDataCreation(@Body() body: {}, @UploadedFiles() files: { 'file': Express.Multer.File[] }) {
        await this.excelToJson.validateExcelHeaders(files['file'], 'core-reference-data-creation')
        await this.excelToJson.excelToJson(files['file'])
        await this.lovCreation.createCoreReferenceMaster()
    }

    @Post('channel-reference-data-creation')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'file', maxCount: 1 },
    ]))
    async channelReferenceDataCreation(@Body() body: { channel_id: number }, @UploadedFiles() files: { 'file': Express.Multer.File[] }) {
        await this.excelToJson.validateExcelHeaders(files['file'], 'channel-reference-data-creation')
        await this.excelToJson.excelToJson(files['file'])
        await this.lovCreation.createChannelReferenceMaster(body.channel_id)
    }

    @Post('core-channel-lov-mapping')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'file', maxCount: 1 },
    ]))
    async coreChannelLovMapping(@Body() body: { channel_id: number }, @UploadedFiles() files: { 'file': Express.Multer.File[] }) {
        await this.excelToJson.validateExcelHeaders(files['file'], 'core-channel-lov-mapping')
        await this.excelToJson.excelToJson(files['file'])
        await this.lovMappingService.coreChnanelLovMapping(body.channel_id)
    }

    @Post('core-tenant-lov-mapping')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'file', maxCount: 1 },
    ]))
    async coreTenantLovMapping(@Body() body: { tenant_id: string, org_id: string }, @UploadedFiles() files: { 'file': Express.Multer.File[] }) {
        await this.excelToJson.validateExcelHeaders(files['file'], 'core-tenant-lov-mapping')
        await this.excelToJson.excelToJson(files['file'])
        await this.lovMappingService.coreTenantLovMapping(body.tenant_id, body.org_id)
    }

    @Get('get-channels')
    async getchannel(@Body() body: {}) {
        return await this.categoryCreation.getChannels()
    }

    @Get('get-tenant')
    async gettenant(@Body() body: {}) {
        return await this.categoryCreation.getTenants()
    }

    @Get('temp')
    async temp(@Body() body: {}) {
        for(let i=0; i<10; i++){
            console.log(i,'-----------------------------------');
            //write into text file
            //wait for 1 sec
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return {}
    }   
    
    @Get('temp1')
    async temp1(@Body() body: {}) {
        for(let i=0; i<10; i++){
            console.log(i,'-----');
            //wait for 
        }

        return {}
    }  
}
