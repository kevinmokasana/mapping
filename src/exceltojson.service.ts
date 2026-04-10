import { HttpException, Injectable } from '@nestjs/common';
import { groupBy, compact, isEmpty } from "lodash";
import * as ExcelJS from 'exceljs';
import * as fs from 'fs'

/**
 * Maps each task (endpoint) to the expected sheet name and
 * the columns that MUST be present in that sheet's header row.
 */
export const TASK_REQUIRED_HEADERS: Record<string, { sheetName: string; headers: string[] }> = {
    // ── Category Creation ──
    'core-creation':                       { sheetName: 'CoreCategory',                    headers: ['Category Path'] },
    'channel-creation':                    { sheetName: 'ChannelCategory',                 headers: ['Category Path'] },

    // ── Category Mapping ──
    'core-channel-cat-mapping':            { sheetName: 'CoreChannelCatMapping',            headers: ['Core Category Path', 'Channel Category Path'] },
    'core-tenant-cat-mapping':             { sheetName: 'CoreTenantCatMapping',             headers: ['Core Category Path', 'Tenant Category Path'] },

    // ── Attribute Creation ──
    'core-attribute-creation':             { sheetName: 'CoreAttribute',                    headers: ['attribute_name', 'display_name', 'attribute_type', 'attribute_data_type', 'length', 'mandatory', 'filter', 'editable', 'visibility', 'searchable', 'constraint'] },
    'channel-attribute-creation':          { sheetName: 'ChannelAttribute',                 headers: ['attribute_name', 'display_name', 'attribute_type', 'attribute_data_type', 'length', 'mandatory', 'filter', 'editable', 'visibility', 'searchable', 'constraint'] },

    // ── Attribute Mapping ──
    'core-channel-attribute-mapping':      { sheetName: 'CoreChannelAttributeMapping',      headers: ['Core Attribute Name', 'Channel Attribute Name', 'Core Category Path', 'Channel Category Path'] },
    'core-tenant-attribute-mapping':       { sheetName: 'CoreTenantAttributeMapping',       headers: ['Core Attribute Name', 'Tenant Attribute Name', 'Core Category Path', 'Tenant Category Path'] },

    // ── Reference Data (LOV) Creation ──
    'core-reference-data-creation':        { sheetName: 'CoreReferenceMasterData',          headers: ['Core Attribute Name', 'Core Reference Data'] },
    'channel-reference-data-creation':     { sheetName: 'ChannelReferenceMasterData',       headers: ['Channel Attribute Name', 'Channel Category Path', 'Channel Reference Data'] },

    // ── LOV Mapping ──
    'core-channel-lov-mapping':            { sheetName: 'CoreChannelLovMapping',            headers: ['Channel Category Path', 'Core Attribute Name', 'Channel Attribute Name', 'Core Reference Data', 'Channel Reference Data'] },
    'core-tenant-lov-mapping':             { sheetName: 'CoreTenantLovMapping',             headers: ['Tenant Category Path', 'Core Attribute Name', 'Tenant Attribute Name', 'Core Reference Data', 'Tenant Reference Data'] },

    // ── Category-Attribute Assignment ──
    'core-category-attribute-mapping':     { sheetName: 'CoreCategoryAttributeMapping',     headers: ['Category Path', 'Attribute Name', 'Mandatory'] },
    'channel-category-attribute-mapping':  { sheetName: 'ChannelCategoryAttributeMapping',  headers: ['Category Path', 'Attribute Name', 'Mandatory'] },
};

@Injectable()
export class ExcelToJson {

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

        const targetSheetName = taskConfig.sheetName;
        const requiredHeaders = taskConfig.headers;

        // Read workbook directly from buffer – no temp file needed
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(file[0].buffer as unknown as ArrayBuffer);

        // Look for the specific sheet by name
        const sheet = workbook.getWorksheet(targetSheetName);
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
        const actualHeaders: string[] = [];
        headerRow.eachCell({ includeEmpty: false }, (cell) => {
            if (cell.value !== null && cell.value !== undefined) {
                actualHeaders.push(cell.value.toString().trim());
            }
        });

        // Find any required columns that are absent
        const missingHeaders = requiredHeaders.filter(
            (required) => !actualHeaders.includes(required),
        );

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

    async excelToJson(file: Express.Multer.File[]) {
        // console.log(file)
        const excelFileName = file[0].originalname



        let json
        
        
        fs.writeFileSync(excelFileName, file[0].buffer)
        let workbook = new ExcelJS.Workbook()
        await workbook.xlsx.readFile(excelFileName)

        for (let sheet of workbook.worksheets) {
            const headerRowNumber = 1
            const json = await this.sheetToJson({ sheet, headerRowNumber })
            const jsonFile = sheet.name + `.json`
            fs.writeFileSync(jsonFile, JSON.stringify(json, null, 2))
        }
        fs.unlinkSync(excelFileName)
        return json
    }

    async sheetToJson({ sheet, headerRowNumber = 1 }) {
        let headerRow = sheet.getRow(headerRowNumber);
        headerRow = headerRow._cells.map((cell) => {
            let header = cell.value;
            return {
                column: cell._column._number,
                address: cell.address,
                value: header,
            };
        });

        let headers = {};
        headerRow.forEach((row) => {
            headers[row.column] = row.value;
        });

        let rows = sheet._rows.map((row) => {
            return row._cells.map((cell) => {
                return {
                    column: cell._column._number,
                    cell: cell.address,
                    value: cell.value,
                };
            });
        });
        let i = 1;
        rows = rows.slice(headerRowNumber).map((row) => {
            let data = [];
            if (isEmpty(compact(row.map((cell) => cell.value)))) return null;

            row.forEach((cell) => {
                let key = headers[cell.column];
                let value = cell.value;
                data.push({ key, value });
            });
            data = groupBy(data, "key");
            for (let key of Object.keys(data)) {
                data[key] = data[key].map((k) => k.value)[0]
                // console.log(data[key]);

                if (data[key] != null && data[key].toString().toLowerCase() === 'true') data[key] = true
                if (data[key] != null && data[key].toString().toLowerCase() === 'false') data[key] = false
            }
            data['RowNo'] = ++i;
            return data;
        });
        rows = compact(rows);
        return rows;
    }

}
