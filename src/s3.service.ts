import { HttpException, Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sanitize = require('sanitize-filename');
import { randomUUID } from 'crypto';
import { AWS_BUCKET_NAME } from './app.constants';

const XLSX_MIME =
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Injectable()
export class S3Service {
    private s3: S3Client;

    constructor() {
        this.s3 = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
        });
    }

    /**
     * Generates a presigned S3 PUT URL the browser can use to upload an Excel
     * file directly, plus the object key reserved for it. AWS credentials never
     * leave the server.
     */
    async getUploadUrl(
        filename: string,
        contentType: string = XLSX_MIME,
    ): Promise<{ url: string; key: string }> {
        if (!AWS_BUCKET_NAME) {
            throw new HttpException('AWS_BUCKET_NAME is not configured', 500);
        }

        const safeName = sanitize(filename || '').trim() || 'upload.xlsx';
        const key = `mapping_uploads/${randomUUID()}-${safeName}`;

        const command = new PutObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: key,
            ContentType: contentType || XLSX_MIME,
        });

        const url = await getSignedUrl(this.s3, command, { expiresIn: 300 });

        return { url, key };
    }

    /**
     * Generates a presigned S3 GET URL so the browser can download a stored
     * object (e.g. the generated error report for a task) by its key. AWS
     * credentials never leave the server.
     */
    async getDownloadUrl(key: string): Promise<{ url: string }> {
        if (!AWS_BUCKET_NAME) {
            throw new HttpException('AWS_BUCKET_NAME is not configured', 500);
        }
        if (!key) {
            throw new HttpException('key is required', 400);
        }

        const filename = key.split('/').pop() || 'download.xlsx';
        const command = new GetObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: key,
            ResponseContentDisposition: `attachment; filename="${filename}"`,
        });

        const url = await getSignedUrl(this.s3, command, { expiresIn: 300 });

        return { url };
    }

    /**
     * Uploads a buffer directly to S3 (server-side) and returns the object key.
     * Used for result/error files generated during task processing.
     */
    async uploadBuffer(
        key: string,
        body: Buffer,
        contentType: string = XLSX_MIME,
    ): Promise<string> {
        if (!AWS_BUCKET_NAME) {
            throw new HttpException('AWS_BUCKET_NAME is not configured', 500);
        }

        await this.s3.send(
            new PutObjectCommand({
                Bucket: AWS_BUCKET_NAME,
                Key: key,
                Body: body,
                ContentType: contentType || XLSX_MIME,
            }),
        );

        return key;
    }
}
