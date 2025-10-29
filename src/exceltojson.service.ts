import { Injectable } from '@nestjs/common';
import { groupBy, compact, isEmpty } from "lodash";
import * as ExcelJS from 'exceljs';
import * as fs from 'fs'

@Injectable()
export class ExcelToJson {

    async excelToJson(file:Express.Multer.File[]){
        const excelFileName = file[0].originalname

        console.log(excelFileName);

        console.log(file[0].fieldname);
        console.log(file[0].buffer);
        
        
        
        fs.writeFileSync(excelFileName, file[0].buffer)
        let workbook = new ExcelJS.Workbook()
        await workbook.xlsx.readFile(excelFileName)

        for(let sheet of workbook.worksheets){
            const headerRowNumber = 1
            const json = await this.sheetToJson({ sheet, headerRowNumber})
            const jsonFile = sheet.name+'.json'
            fs.writeFileSync(jsonFile, JSON.stringify(json, null,2))
        }
        fs.unlinkSync(excelFileName)
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
                
                if(data[key]!=null && data[key].toString().toLowerCase()==='true') data[key] = true
                if(data[key]!=null && data[key].toString().toLowerCase()==='false') data[key] = false
            }
            data['RowNo'] = ++i;
            return data;
        });
        rows = compact(rows);
        return rows;
    }

}
