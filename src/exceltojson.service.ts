import { HttpException, Injectable } from '@nestjs/common';
import { groupBy, compact, isEmpty } from "lodash";
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { AWS_BUCKET_NAME } from './app.constants';

/**
 * Maps each task (endpoint) to the expected sheet name and
 * the columns that MUST be present in that sheet's header row.
 */
export const TASK_REQUIRED_HEADERS: Record<string, { sheetName: string; headers: string[] }> = {
    // ── Category Creation ──
    'core-creation': { sheetName: 'CoreCategory', headers: ['Category Path'] },
    'channel-creation': { sheetName: 'ChannelCategory', headers: ['Category Path'] },

    // ── Category Mapping ──
    'core-channel-cat-mapping': { sheetName: 'CoreChannelCatMapping', headers: ['Core Category Path', 'Channel Category Path'] },
    'core-tenant-cat-mapping': { sheetName: 'CoreTenantCatMapping', headers: ['Core Category Path', 'Tenant Category Path'] },

    // ── Attribute Creation ──
    'core-attribute-creation': { sheetName: 'CoreAttribute', headers: ['attribute_name', 'display_name', 'attribute_type', 'attribute_data_type', 'length', 'mandatory', 'filter', 'editable', 'visibility', 'searchable', 'constraint'] },
    'channel-attribute-creation': { sheetName: 'ChannelAttribute', headers: ['attribute_name', 'display_name', 'attribute_type', 'attribute_data_type', 'length', 'mandatory', 'filter', 'editable', 'visibility', 'searchable', 'constraint'] },

    // ── Attribute Mapping ──
    'core-channel-attribute-mapping': { sheetName: 'CoreChannelAttributeMapping', headers: ['Core Attribute Name', 'Channel Attribute Name', 'Core Category Path', 'Channel Category Path'] },
    'core-tenant-attribute-mapping': { sheetName: 'CoreTenantAttributeMapping', headers: ['Core Attribute Name', 'Tenant Attribute Name', 'Core Category Path', 'Tenant Category Path'] },

    // ── Reference Data (LOV) Creation ──
    'core-reference-data-creation': { sheetName: 'CoreReferenceMasterData', headers: ['Core Attribute Name', 'Core Reference Data'] },
    'channel-reference-data-creation': { sheetName: 'ChannelReferenceMasterData', headers: ['Channel Attribute Name', 'Channel Category Path', 'Channel Reference Data'] },

    // ── LOV Mapping ──
    'core-channel-lov-mapping': { sheetName: 'CoreChannelLovMapping', headers: ['Channel Category Path', 'Core Attribute Name', 'Channel Attribute Name', 'Core Reference Data', 'Channel Reference Data'] },
    'core-tenant-lov-mapping': { sheetName: 'CoreTenantLovMapping', headers: ['Tenant Category Path', 'Core Attribute Name', 'Tenant Attribute Name', 'Core Reference Data', 'Tenant Reference Data'] },

    // ── Category-Attribute Assignment ──
    'core-category-attribute-mapping': { sheetName: 'CoreCategoryAttributeMapping', headers: ['Category Path', 'Attribute Name', 'Mandatory'] },
    'channel-category-attribute-mapping': { sheetName: 'ChannelCategoryAttributeMapping', headers: ['Category Path', 'Attribute Name', 'Mandatory'] },
};

/**
 * Maps each task to the failed-rows JSON file its processing service writes to
 * disk. After processing, this file is read back, turned into an error .xlsx and
 * uploaded to S3 so the user can see exactly which rows failed and why.
 */
export const TASK_ERROR_FILES: Record<string, string> = {
    'core-channel-cat-mapping': 'coreChannelCatMappingFailedRows.json',
    'core-tenant-cat-mapping': 'coreTenantCatMappingFailedRows.json',
    'core-attribute-creation': 'attribute_failed.json',
    'channel-attribute-creation': 'attribute_failed.json',
    'core-channel-attribute-mapping': 'core_channe_attribute_mapping_failed.json',
    'core-tenant-attribute-mapping': 'core_tenant_attribute_mapping_failed.json',
    'core-reference-data-creation': 'core_lov_creation_failed.json',
    'channel-reference-data-creation': 'channel_lov_creation_failed.json',
    'core-channel-lov-mapping': 'core_channel_lov_mapping_failed.json',
    'core-tenant-lov-mapping': 'core_tenant_lov_mapping_failed.json',
};

@Injectable()
export class ExcelToJson {
    private s3: S3Client;

    constructor() {
        this.s3 = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
        });
    }

    /**
     * Downloads the file from S3 and returns it in the format expected by Multer
     * to seamlessly replace the old upload flow.
     */
    async getExcelFileFromS3(s3Key: string): Promise<Express.Multer.File[]> {
        if (!AWS_BUCKET_NAME) {
            throw new HttpException('AWS_BUCKET_NAME is not configured', 500);
        }

        const command = new GetObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: s3Key,
        });

        const response = await this.s3.send(command);
        const stream = response.Body as NodeJS.ReadableStream;
        const chunks: Buffer[] = [];
        
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        
        const buffer = Buffer.concat(chunks);
        const originalname = s3Key.split('/').pop() || 'uploaded_file.xlsx';

        return [{
            fieldname: 'files',
            originalname,
            encoding: '7bit',
            mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            buffer,
            size: buffer.length,
            stream: null,
            destination: '',
            filename: originalname,
            path: ''
        }] as any;
    }

    /**
     * Validates that the uploaded .xlsx file contains the expected sheet
     * and that the sheet includes every required column for the given task.
     *
     * @param file      – The uploaded Multer file array (same format used by excelToJson)
     * @param task      – A key from TASK_REQUIRED_HEADERS (matches the endpoint name)
     * @throws HttpException 400 if sheet is missing or required columns are absent
     */
    async validateExcelHeaders(file: Express.Multer.File[], task: string) {
        const taskConfig = TASK_REQUIRED_HEADERS[task];
        if (!taskConfig) {
            throw new HttpException(
                `Unknown task "${task}". No header validation rules found.`,
                400,
            );
        }
        console.log(taskConfig);

        const targetSheetName = taskConfig.sheetName;
        const requiredHeaders = taskConfig.headers;
        console.log(targetSheetName);

        // Read workbook directly from buffer – no temp file needed
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(file[0].buffer as unknown as ArrayBuffer);

        // Look for the specific sheet by name
        const sheet = workbook.getWorksheet(targetSheetName);
        // console.log(sheet.name, ' - sheetname');

        if (!sheet) {
            throw new HttpException(
                {
                    message: `Sheet "${targetSheetName}" not found in the uploaded file for task "${task}".`,
                    expectedSheet: targetSheetName,
                },
                400,
            );
        }

        // Extract header values from row 1 (trimmed, case-preserved)
        const headerRow = sheet.getRow(1);
        // console.log(headerRow, '- headerrow');

        const actualHeaders: string[] = [];
        headerRow.eachCell({ includeEmpty: false }, (cell) => {
            if (cell.value !== null && cell.value !== undefined) {
                actualHeaders.push(cell.value.toString().trim());
            }
        });
        // console.log(actualHeaders, '- actual header');

        // Find any required columns that are absent
        const missingHeaders = requiredHeaders.filter(
            (required) => !actualHeaders.includes(required),
        );

        // console.log(missingHeaders, '- missing header');

        if (missingHeaders.length > 0) {
            throw new HttpException(
                {
                    message: `Sheet "${targetSheetName}" is missing required columns for task "${task}".`,
                    sheet: targetSheetName,
                    missingColumns: missingHeaders,
                    expectedColumns: requiredHeaders,
                    foundColumns: actualHeaders,
                },
                400,
            );
        }
    }

    async excelToJson(file: Express.Multer.File[], keepAsBoolean: boolean = false, sheetName?: string) {
        // console.log(file)
        console.log(keepAsBoolean);

        const excelFileName = file[0].originalname

        let json: any
        fs.writeFileSync(excelFileName, file[0].buffer)
        let workbook = new ExcelJS.Workbook()
        await workbook.xlsx.readFile(excelFileName)

        // Only generate JSON for the required sheet(s). When a sheetName is
        // provided, just that sheet is converted; otherwise fall back to all.
        const sheets = sheetName
            ? [workbook.getWorksheet(sheetName)]
            : workbook.worksheets

        if (sheetName && !sheets[0]) {
            fs.unlinkSync(excelFileName)
            throw new HttpException(`Sheet "${sheetName}" not found in the uploaded file.`, 400)
        }

        for (let sheet of sheets) {
            //use inbuild function to convert into json
            const headerRowNumber = 1

            // const jsonData = XLSX.utils.sheet_to_json(worksheet);

            json = await this.sheetToJson({ sheet, headerRowNumber }, keepAsBoolean)
            const jsonFile = sheet.name + `.json`
            fs.writeFileSync(jsonFile, JSON.stringify(json, null, 2))
        }
        fs.unlinkSync(excelFileName)
        return json
    }

    // async sheetToJson({ sheet, headerRowNumber = 1 }, keepAsBoolean: boolean = false) {
    //     let headerRow = sheet.getRow(headerRowNumber);
    //     headerRow = headerRow._cells.map((cell) => {
    //         let header = cell.value;
    //         return {
    //             column: cell._column._number,
    //             address: cell.address,
    //             value: header,
    //         };
    //     });

    //     let headers = {};
    //     headerRow.forEach((row) => {
    //         headers[row.column] = row.value;
    //     });

    //     let rows = sheet._rows.map((row) => {
    //         return row._cells.map((cell) => {
    //             return {
    //                 column: cell._column._number,
    //                 cell: cell.address,
    //                 value: cell.value,
    //             };
    //         });
    //     });
    //     let i = 1;
    //     rows = rows.slice(headerRowNumber).map((row) => {
    //         let data = [];
    //         if (isEmpty(compact(row.map((cell) => cell.value)))) return null;

    //         row.forEach((cell) => {
    //             let key = headers[cell.column];
    //             let value = cell.value;
    //             data.push({ key, value });
    //         });

    //         data = groupBy(data, "key");


    //         for (let key of Object.keys(data)) {
    //             data[key] = data[key].map((k) => k.value)[0]

    //             if (keepAsBoolean) {
    //                 if (data[key] != null && data[key].toString().toLowerCase() === 'true') data[key] = true
    //                 if (data[key] != null && data[key].toString().toLowerCase() === 'false') data[key] = false

    //                 if(data[key] != null && data[key].result === true) data[key] = true
    //                 if(data[key] != null && data[key].result === false) data[key] = false
    //             }
    //             if (!keepAsBoolean && typeof data[key] === 'boolean') {
    //                 data[key] = data[key] ? 'TRUE' : 'FALSE';
    //             }
    //         }

    //         data['RowNo'] = ++i;
    //         return data;
    //     });
    //     rows = compact(rows);
    //     return rows;
    // }
    async sheetToJson({ sheet, headerRowNumber = 1 }, keepAsBoolean: boolean = false) {
        let headerRow = sheet.getRow(headerRowNumber);
        headerRow = headerRow._cells.map((cell) => {
            return {
                column: cell._column._number,
                address: cell.address,
                value: cell.value,
            };
        });

        let headers = {};
        headerRow.forEach((row) => {
            headers[row.column] = row.value;
        });

        const headerColumns = headerRow.map((h) => h.column);

        let rows = sheet._rows.map((row) => {
            // index cells by column number for quick lookup
            const cellsByCol = {};
            row._cells.forEach((cell) => {
                cellsByCol[cell._column._number] = cell.value;
            });
            return cellsByCol;
        });

        let i = 1;
        rows = rows.slice(headerRowNumber).map((cellsByCol) => {
            // empty-row check based on header columns
            const values = headerColumns.map((col) =>
                cellsByCol[col] === undefined ? null : cellsByCol[col]
            );
            if (isEmpty(compact(values))) return null;

            let data: any = {};
            for (let col of headerColumns) {
                const key = headers[col];
                let value = cellsByCol[col];
                if (value === undefined || value === null) value = null;

                // formula cell -> take computed result
                if (value !== null && typeof value === 'object' && 'result' in value) {
                    value = value.result;
                }
                // rich text / hyperlink fallback
                if (value !== null && typeof value === 'object' && 'text' in value) {
                    value = value.text;
                }

                if (value !== null && keepAsBoolean) {
                    if (value.toString().toLowerCase() === 'true') value = true;
                    if (value.toString().toLowerCase() === 'false') value = false;
                }
                if (!keepAsBoolean && typeof value === 'boolean') {
                    value = value ? 'TRUE' : 'FALSE';
                }

                data[key] = value;
            }

            data['RowNo'] = ++i;
            return data;
        });

        rows = compact(rows);
        return rows;
    }

    /**
     * Builds an .xlsx workbook (in memory) from an array of row objects and
     * returns it as a Buffer. Column headers are taken from the union of keys
     * across all rows so nothing is dropped. Used to produce the error report.
     */
    async jsonToExcelBuffer(rows: any[], sheetName: string = 'Errors'): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(sheetName.slice(0, 31)); // Excel caps sheet names at 31 chars

        // Collect every key seen across rows, preserving first-seen order.
        const columns: string[] = [];
        for (const row of rows) {
            for (const key of Object.keys(row || {})) {
                if (!columns.includes(key)) columns.push(key);
            }
        }

        sheet.columns = columns.map((key) => ({ header: key, key }));

        for (const row of rows) {
            const flat: Record<string, any> = {};
            for (const key of columns) {
                const value = row?.[key];
                flat[key] =
                    value !== null && typeof value === 'object'
                        ? JSON.stringify(value)
                        : value;
            }
            sheet.addRow(flat);
        }

        const arrayBuffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(arrayBuffer);
    }

}
