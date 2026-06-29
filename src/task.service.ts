import { HttpException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TaskLog } from './task-log.entity';
import { WRITE_DB_NAME } from './app.constants';

export type TaskStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';

export interface CreateTaskDto {
    task_type: string;
    input_s3_key: string;
    channel_id?: number;
    tenant_id?: string;
    org_id?: string;
}

@Injectable()
export class TaskService {
    constructor(
        @InjectDataSource(WRITE_DB_NAME) private dataSource: DataSource,
    ) {}

    /**
     * Creates a new task_logs entry with status PENDING.
     * Returns the created task with its UUID.
     */
    async createTask(dto: CreateTaskDto): Promise<TaskLog> {
        const repo = this.dataSource.getRepository(TaskLog);

        const task = repo.create({
            task_type: dto.task_type,
            status: 'PENDING' as TaskStatus,
            input_s3_key: dto.input_s3_key,
            channel_id: dto.channel_id || null,
            tenant_id: dto.tenant_id || null,
            org_id: dto.org_id || null,
        });

        return await repo.save(task);
    }

    /**
     * Finds a task by its UUID.
     */
    async findById(id: string): Promise<TaskLog> {
        const repo = this.dataSource.getRepository(TaskLog);
        const task = await repo.findOne({ where: { id } });

        if (!task) {
            throw new HttpException(`Task with id "${id}" not found`, 404);
        }

        return task;
    }

    /**
     * Returns all tasks ordered by created_at descending (newest first).
     */
    async findAll(): Promise<TaskLog[]> {
        const repo = this.dataSource.getRepository(TaskLog);
        return await repo.find({
            order: { created_at: 'DESC' },
        });
    }

    /**
     * Updates the status of a task.
     * Optionally sets message, error_message, and result_s3_key.
     */
    async updateStatus(
        id: string,
        status: TaskStatus,
        message?: string,
        errorMessage?: string,
        resultS3Key?: string,
    ): Promise<TaskLog> {
        const repo = this.dataSource.getRepository(TaskLog);

        const updateData: Partial<TaskLog> = { status };

        if (message !== undefined) updateData.message = message;
        if (errorMessage !== undefined) updateData.error_message = errorMessage;
        if (resultS3Key !== undefined) updateData.result_s3_key = resultS3Key;

        await repo.update(id, updateData);

        return await this.findById(id);
    }
}
