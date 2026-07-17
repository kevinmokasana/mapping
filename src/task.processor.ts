import { Processor, WorkerHost, OnWorkerEvent, InjectQueue } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import { TaskService } from './task.service';
import { CategoryCreation } from './category.creation.service';
import { CategoryMappingService } from './category.mapping.service';
import { AttributeCreation } from './attribute.creation.service';
import { AttributeMappingService } from './attribute.mapping.service';
import { LovCreation } from './lov.creation.service';
import { LovMappingService } from './lov.mapping.service';
import { ExcelToJson, TASK_REQUIRED_HEADERS, TASK_ERROR_FILES } from './exceltojson.service';
import { S3Service } from './s3.service';
import * as fs from 'fs';
import * as path from 'path';

// concurrency: 1  -> tasks share on-disk json files in process.cwd(), so only
//                    one task may run at a time (and it lets a re-prioritised
//                    retry reliably run before any other queued task).
// maxStalledCount: 1 -> a task whose worker died mid-run (stalled) is recovered
//                    and reprocessed once before being marked failed.
@Processor('task-queue', { concurrency: 1, maxStalledCount: 1 })
export class TaskProcessor extends WorkerHost {
    constructor(
        @InjectQueue('task-queue') private readonly taskQueue: Queue,
        private readonly taskService: TaskService,
        private readonly categoryCreation: CategoryCreation,
        private readonly categoryMappingService: CategoryMappingService,
        private readonly attributeCreation: AttributeCreation,
        private readonly attributeMappingService: AttributeMappingService,
        private readonly lovCreation: LovCreation,
        private readonly lovMappingService: LovMappingService,
        private readonly excelToJson: ExcelToJson,
        private readonly s3Service: S3Service,
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const taskId = job.data.taskId;

        try {
            // Update status to PROCESSING
            await this.taskService.updateStatus(taskId, 'PROCESSING');
            const task = await this.taskService.findById(taskId);

            // 1. Get excel file using s3 url (this replaces the flow of multer)
            console.log(`Downloading file from S3: ${task.input_s3_key}`);
            const files = await this.excelToJson.getExcelFileFromS3(task.input_s3_key);

            // 2. Validate Headers
            await this.excelToJson.validateExcelHeaders(files, task.task_type);

            // 3. Generate json from that excel (only the sheet this task needs)
            const keepAsBoolean = task.task_type.includes('attribute-creation');
            const requiredSheet = TASK_REQUIRED_HEADERS[task.task_type]?.sheetName;
            await this.excelToJson.excelToJson(files, keepAsBoolean, requiredSheet);

            // Remove any stale failed-rows file from a previous run so we only
            // read the errors produced by THIS task.
            const errorFilePath = this.getErrorFilePath(task.task_type);
            if (errorFilePath && fs.existsSync(errorFilePath)) {
                fs.unlinkSync(errorFilePath);
            }

            // 4. Do processing using the generated excel/json
            switch (task.task_type) {
                case 'core-creation':
                    await this.categoryCreation.bulkUploadCategory('core');
                    break;
                case 'channel-creation':
                    await this.categoryCreation.bulkUploadCategory('channel', task.channel_id);
                    break;
                case 'core-channel-cat-mapping':
                    await this.categoryMappingService.coreChannelCatMapping(task.channel_id);
                    break;
                case 'core-tenant-cat-mapping':
                    await this.categoryMappingService.coreTenantCatMapping(task.tenant_id, task.org_id);
                    break;
                case 'core-attribute-creation':
                    await this.attributeCreation.bulkUploadAttribute('Core');
                    break;
                case 'channel-attribute-creation':
                    await this.attributeCreation.bulkUploadAttribute('Channel', task.channel_id);
                    break;
                case 'core-channel-attribute-mapping':
                    await this.attributeMappingService.coreChannleAttributeMapping(task.channel_id);
                    break;
                case 'core-tenant-attribute-mapping':
                    await this.attributeMappingService.coreTenantAttributeMapping(task.tenant_id, task.org_id);
                    break;
                case 'core-reference-data-creation':
                    await this.lovCreation.createCoreReferenceMaster();
                    break;
                case 'channel-reference-data-creation':
                    await this.lovCreation.createChannelReferenceMaster(task.channel_id);
                    break;
                case 'core-channel-lov-mapping':
                    await this.lovMappingService.coreChnanelLovMapping(task.channel_id);
                    break;
                case 'core-tenant-lov-mapping':
                    await this.lovMappingService.coreTenantLovMapping(task.tenant_id, task.org_id);
                    break;
                default:
                    throw new Error(`Unknown task_type: ${task.task_type}`);
            }

            // 5. Build an error report (if any rows failed), upload it and set
            //    the status accordingly.
            const failedRows = this.readFailedRows(task.task_type);

            if (failedRows.length > 0) {
                const sheetName = TASK_REQUIRED_HEADERS[task.task_type]?.sheetName || 'Errors';
                const errorBuffer = await this.excelToJson.jsonToExcelBuffer(failedRows, sheetName);
                const ext = path.extname(task.file_name || '.xlsx') || '.xlsx';
                const base = path.basename(task.file_name || 'error_report', ext);
                const errorKey = `mapping_errors/${base}_error_${taskId}${ext}`;
                await this.s3Service.uploadBuffer(errorKey, errorBuffer);
 
                await this.taskService.updateStatus(
                    taskId,
                    'COMPLETED_WITH_ERRORS',
                    `${failedRows.length} row(s) failed. See the error report.`,
                    undefined,
                    errorKey,
                );
                console.log(`Task ${task.id} completed with ${failedRows.length} failed row(s)`);
            } else {
                await this.taskService.updateStatus(taskId, 'COMPLETED', 'Task processed successfully');
                console.log(`Task ${task.id} completed successfully`);
            }

        } catch (error) {
            console.error(`Error processing task ${taskId}:`, error);
            // 5. Upload status accordingly (failed)
            await this.taskService.updateStatus(taskId, 'FAILED', undefined, error.message);
            throw error;
        } finally {
            // 6. Remove the generated input json and the failed-rows json from disk.
            try {
                const task = await this.taskService.findById(taskId);
                const taskConfig = TASK_REQUIRED_HEADERS[task.task_type];

                const filesToClean = [
                    taskConfig?.sheetName ? path.join(process.cwd(), `${taskConfig.sheetName}.json`) : null,
                    this.getErrorFilePath(task.task_type),
                ];

                for (const filePath of filesToClean) {
                    if (filePath && fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`Cleaned up generated file: ${filePath}`);
                    }
                }
            } catch (cleanupError) {
                console.error(`Failed to cleanup json file for task ${taskId}:`, cleanupError);
            }
        }
    }

    /**
     * Fires when a job throws. If it still has retry attempts left, BullMQ will
     * re-queue it; we bump its priority to the top (1) so the retry is picked up
     * before any normally-queued task instead of going to the back of the queue.
     */
    @OnWorkerEvent('failed')
    async onFailed(job: Job): Promise<void> {
        if (!job) return;
        const maxAttempts = job.opts.attempts ?? 1;
        const willRetry = job.attemptsMade < maxAttempts;
        if (!willRetry) return;

        try {
            await job.changePriority({ priority: 1 });
            console.log(
                `Task ${job.data?.taskId} failed — retry re-prioritised to front of queue ` +
                `(attempt ${job.attemptsMade + 1}/${maxAttempts})`,
            );
        } catch (err) {
            console.error(`Failed to re-prioritise retry for task ${job.data?.taskId}:`, err);
        }
    }

    /**
     * Fires when a job stalls — e.g. the service died mid-processing so the job
     * lock expired. BullMQ moves it back to the queue; we bump it to the top (1)
     * so the recovered task is reprocessed before any normally-queued task.
     */
    @OnWorkerEvent('stalled')
    async onStalled(jobId: string): Promise<void> {
        try {
            const job = await this.taskQueue.getJob(jobId);
            if (!job) return;
            await job.changePriority({ priority: 1 });
            console.log(
                `Task ${job.data?.taskId ?? jobId} stalled — re-prioritised to front of queue`,
            );
        } catch (err) {
            console.error(`Failed to re-prioritise stalled job ${jobId}:`, err);
        }
    }

    /**
     * Absolute path of the failed-rows json file a task's service writes, or
     * null if that task type does not produce one.
     */
    private getErrorFilePath(taskType: string): string | null {
        const errorFile = TASK_ERROR_FILES[taskType];
        return errorFile ? path.join(process.cwd(), errorFile) : null;
    }

    /**
     * Reads and parses the failed-rows json produced during processing.
     * Returns an empty array when there is no file or no failures.
     */
    private readFailedRows(taskType: string): any[] {
        const errorFilePath = this.getErrorFilePath(taskType);
        if (!errorFilePath || !fs.existsSync(errorFilePath)) {
            return [];
        }

        try {
            const parsed = JSON.parse(fs.readFileSync(errorFilePath, 'utf-8'));
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            console.error(`Failed to read error file ${errorFilePath}:`, err);
            return [];
        }
    }
}
