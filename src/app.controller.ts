import { Body, Controller, Get, Post, Param, Query, UploadedFiles, UseInterceptors, Res } from '@nestjs/common';
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

import { channel } from 'diagnostics_channel';
import { NewMappingService } from './new.mapping.service'
import { LOVExtractor } from './lov.extractor';
import { TaskService } from './task.service';
import { TASK_REQUIRED_HEADERS } from './exceltojson.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { S3Service } from './s3.service';

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
        private readonly newMappingService:NewMappingService,
        private readonly lovExtractor:LOVExtractor,
        private readonly taskService: TaskService,
        private readonly s3Service: S3Service,
        @InjectQueue('task-queue') private readonly taskQueue: Queue,
    ) {}

    /**
     * GET /upload-url
     * Returns a presigned S3 PUT URL plus the reserved object key so the
     * browser can upload an Excel file directly to S3, then submit a task
     * against the returned key.
     */
    @Get('upload-url')
    async getUploadUrl(
        @Query('filename') filename: string,
        @Query('content_type') contentType?: string,
    ) {
        return await this.s3Service.getUploadUrl(filename, contentType);
    }

    /**
     * GET /download-url
     * Returns a presigned S3 GET URL so the browser can download a stored
     * object (e.g. a task's generated error report) by its key.
     */
    @Get('download-url')
    async getDownloadUrl(@Query('key') key: string) {
        return await this.s3Service.getDownloadUrl(key);
    }

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
        await this.excelToJson.excelToJson(files['file'], true)
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
            await this.excelToJson.excelToJson(files['file'], true)
            // return ""
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
    
    @Post('new-mappings')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'files', maxCount: 20 },
        { name: 'catmap', maxCount: 1 },
        { name: 'lovmap', maxCount:1}
    ]))
    async newMappings(@Body() body, @UploadedFiles() files: { 'files': Express.Multer.File[]}, @UploadedFiles() catmap: { 'catmap': Express.Multer.File[]}
        ,@UploadedFiles() lovmap: { 'lovmap': Express.Multer.File[]}
    ){
        await this.newMappingService.generateMappings(files.files, body.tenant_id, body.org_id, body.marketplace, catmap.catmap, lovmap.lovmap)
    } 

    @Post('ai-lov')
    async aiLOV(@Body() body){
        // await this.newMappingService.fillAbsoluteCommonLovMappings()
        await this.newMappingService.transferAiLovMappingsToMainLovMappings()
    } 
       

    @Post('lov-extract')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'files', maxCount: 20 }
    ]))
    async extractLOV(@Body() body, @UploadedFiles() files: { 'files': Express.Multer.File[]}
    ){
        await this.lovExtractor.extractLOV(files.files, body.marketplace)
    }  

    // ─── Task History Endpoints ──────────────────────────────────────────

    /**
     * POST /task
     * Accepts a task_type + input_s3_key, creates a task_logs entry,
     * and returns immediately with { task_id, status: 'PENDING' }.
     * Background processing will be triggered separately (Phase 3).
     */
    @Post('task')
    async submitTask(@Body() body: {
        task_type: string;
        input_s3_key: string;
        channel_id?: number;
        tenant_id?: string;
        org_id?: string;
    }) {
        console.log('in task');
        
        // Validate that task_type is a known task
        if (!TASK_REQUIRED_HEADERS[body.task_type]) {
            return {
                statusCode: 400,
                message: `Unknown task_type "${body.task_type}". Valid types: ${Object.keys(TASK_REQUIRED_HEADERS).join(', ')}`,
            };
        }

        // Validate input_s3_key is provided
        if (!body.input_s3_key) {
            return {
                statusCode: 400,
                message: 'input_s3_key is required',
            };
        }

        // Create the task_logs entry with status PENDING
        const task = await this.taskService.createTask({
            task_type: body.task_type,
            input_s3_key: body.input_s3_key,
            channel_id: body.channel_id,
            tenant_id: body.tenant_id,
            org_id: body.org_id,
        });

        // Add to BullMQ queue
        await this.taskQueue.add('process-task', {
            taskId: task.id
        }, {
            removeOnComplete: true, // Automatically remove from queue when done
            removeOnFail: false // Keep in queue if failed for debugging/retry
        });

        return {
            task_id: task.id,
            status: task.status,
            message: 'Task submitted successfully. Track it in Task History.',
        };
    }

    /**
     * GET /tasks
     * Returns all tasks ordered by created_at DESC for the Task History page.
     */
    @Get('tasks')
    async getAllTasks() {
        console.log('in tasks');
        return await this.taskService.findAll();
    }

    /**
     * GET /task/:id
     * Returns a single task's details and current status.
     */
    @Get('task/:id')
    async getTaskById(@Param('id') id: string) {
        return await this.taskService.findById(id);
    }
}

