import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('task_logs')
export class TaskLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 100 })
    task_type: string;

    @Column({ length: 30, default: 'PENDING' })
    status: string; // PENDING | PROCESSING | COMPLETED | COMPLETED_WITH_ERRORS | FAILED

    @Column({ length: 500 })
    input_s3_key: string;

    @Column({ length: 255, nullable: true })
    file_name: string; // original name of the uploaded file

    @Column({ length: 500, nullable: true })
    result_s3_key: string;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({ type: 'text', nullable: true })
    error_message: string;

    @Column({ nullable: true })
    channel_id: number;

    @Column({ length: 100, nullable: true })
    tenant_id: string;

    @Column({ length: 100, nullable: true })
    org_id: string;

    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
    updated_at: Date;
}
