import { HttpException, Injectable } from '@nestjs/common';
import { BulkUploadAttributeJSONData, BulkUploadCategoryJsonData, MetaData } from './dto';
import * as fs from 'fs'
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';
import { Attribute, ChannelAttribute, ChannelCategory, ChannelReferenceAttributes, ChannelReferenceMaster, ChannelRefereneData, CoreAttribute, CoreCategory, CoreChannelReferenceDataMapping, CoreReferenceAttributes, CoreReferenceMaster, CoreRefereneData, CoreTenantReferenceDataMapping, ReferenceMasterData, TenantCategoryPath } from './tables.entity';
import * as dotenv from 'dotenv'
import { WRITE_DB_NAME } from './app.constants';
import * as ExcelJS from 'exceljs';
import { ExcelToJson } from './exceltojson.service';
var sanitize = require("sanitize-filename");
var XLSX = require("xlsx");
// import { DataSource, EntityManager, In } from 'typeorm'
const mm = {
    Ajio: {
        mAttributeRow:3,
        pimAttributeRow:4,
        valuesRow:5,
        staticWorksheets:['Template Instructions', 'Image Guidelines', 'sheetForStoringExtraValues', 'Seller Information Sheet']
    },
    Myntra:{
        mAttributeRow:3,
        pimAttributeRow:4,
        valuesRow:5,
        staticWorksheets:['__INSTRUCTIONS', 'masterdata']
    },
    Nykaa:{
        mAttributeRow:3,
        pimAttributeRow:4,
        valuesRow:5,
        staticWorksheets:['Instructions Sheet', 'mastersheet']
    },
    TataCliq:{
        mAttributeRow:5,
        attributesToFetchLOV:4,
        pimAttributeRow:6,
        valuesRow:7,
        staticWorksheets:['Category Mapping', 'Content - Rules', 'Imaging Rules', 'LOV values'],
        lovSheet:'LOV values',
        lovKey:'ATTRNAME',
        lovValue:'LOVNAME'
    }
}


dotenv.config()
@Injectable()
export class LOVExtractor {

    constructor(
        @InjectDataSource(WRITE_DB_NAME) private dataSource:DataSource,
        private readonly excelToJson:ExcelToJson
    ){}

    async getWorksheetNames(workbook) {
        const names = [];
        workbook.eachSheet(function(worksheet, sheetId) {
            names.push(worksheet.name); // Access the name property
        });
        return names;
    }

    getLOVs(ref:string, workbook){
        let dropdownValues = []
        
        const [sheetNameRaw, cellRange] = ref.includes('!') ? ref.split('!') : ref.split('.')
        const refSheetName = sheetNameRaw.replace(/'/g, '').replace('$', '');
        const refSheet = workbook.getWorksheet(refSheetName);

        const [startCell, endCell] = cellRange.replace(/\$/g, '').split(':');
        const startRow = refSheet.getCell(startCell).row;
        const endRow = (endCell===undefined)? startRow : refSheet.getCell(endCell).row;
        const refCol = refSheet.getCell(startCell).col;

        for (let r = startRow; r <= endRow; r++) {
            const val = refSheet.getRow(r).getCell(refCol).value;
            if (val) dropdownValues.push(val.toString());
        }
        return dropdownValues
    }

    async extractLOV(files:Express.Multer.File[], marketplace:string){
        // let json
        let lovmapping
        
        const lovMapExcel = []
        const fileNames = []
        for(let file of files){
            const excelFileName = file.originalname
            fs.writeFileSync(excelFileName, file.buffer)
            fileNames.push(excelFileName)
        }  
        const marketplaceMetadata = mm[marketplace]
        const mappings = await this.dataSource.manager.query(`select * from temp_channel_mappings`)
        fs.writeFileSync(`mappingBackup${Date.now()}.json`, JSON.stringify(mappings, null,2))
        for(let fileName of fileNames){
            let dropdown
            const workbook = new ExcelJS.Workbook()
            await workbook.xlsx.readFile(fileName)
            const definedNames = {}
                workbook.definedNames.model.forEach(def => {
                definedNames[def.name] = def.ranges[0]; // e.g. ["'HiddenSheet'!$A$2:$A$50"]
            });
            const workSheets = (await this.getWorksheetNames(workbook)).filter(x=>!marketplaceMetadata.staticWorksheets.includes(x))
            for(let workSheet of workSheets){
                const sheet = workbook.getWorksheet(workSheet)
                let mCategory = ``
                if(marketplace=='Ajio')
                    mCategory = sheet.getRow(1).getCell(1).value.toString()
                if(marketplace=='Myntra' || marketplace=='Nykaa')
                    mCategory = workSheet
                if(marketplace=='TataCliq')
                    mCategory = fileName.split('.')[0]


                const mAttributeRow = sheet.getRow(marketplaceMetadata.mAttributeRow)
                const valueRow = sheet.getRow(marketplaceMetadata.valuesRow)
                let ftechLOVAttr
                if(marketplaceMetadata.attributesToFetchLOV!=undefined){
                    ftechLOVAttr = sheet.getRow(marketplaceMetadata.attributesToFetchLOV)
                }
                const lovs = []
                const lovMap = {}
                mAttributeRow.eachCell((cell, colNumber) => {
                    if (cell.value) {
                        let mAttribute = cell.value.toString().trim()
                        let fAttrLOV
                        if(ftechLOVAttr!=undefined){
                            console.log(ftechLOVAttr.getCell(colNumber).value)
                            fAttrLOV = ftechLOVAttr.getCell(colNumber).value?.toString()?.trim()
                            if(fAttrLOV?.includes(' (Refer LOV List)')) fAttrLOV = fAttrLOV?.replace(' (Refer LOV List)', '')
                        }
                        // const value = valueRow.getCell(colNumber).value?.toString()?.trim()
                        const valueCell = valueRow.getCell(colNumber)
                        if(mAttribute=='*Primary color'){
                            console.log(valueCell.dataValidation?.type)
                        }
                        if (valueCell.dataValidation?.type=='list') {
                            if(lovMap[mAttribute]==undefined) lovMap[mAttribute] = []
                            let formula = valueCell.dataValidation.formulae[0]
                            if(definedNames[formula]!=undefined){
                                formula = definedNames[formula]
                            }
                            const dropdownValues = this.getLOVs(formula, workbook)
                            for(let v of dropdownValues){
                                lovs.push({
                                    category:mCategory,
                                    attribute:mAttribute,
                                    value:v
                                })
                                lovMap[mAttribute].push(v)
                            }
                        }
                        }
                    }
                );
                const catName = fileName.split('.')[0]
                const [{channel_id}] = await this.dataSource.manager.query(`select channel_id from subscribed_channels where tenant_id = 'IND0038' and channel_name = '${marketplace}'`)
                const mappings = await this.dataSource.manager.query(`SELECT * from temp_channel_mappings where channel_id = ${channel_id} and myntra_category = '${catName}'`)
                console.log(mappings.length)
                const lovMapping = mappings[0].lov_mappings
                for(let marketAttr in lovMapping){
                    lovMapping[marketAttr]['valuesToMap'] = lovMap[marketAttr]
                }
                await this.dataSource.manager.query(`update temp_channel_mappings set lov_mappings = $1 where channel_id = ${channel_id} and myntra_category = '${catName}'`, [lovMapping])
                const workbookss = XLSX.utils.book_new();
                const worksheet1 = XLSX.utils.json_to_sheet(lovs);
                XLSX.utils.book_append_sheet(workbookss, worksheet1, "LOV");
                XLSX.writeFile(workbookss, `[${marketplace}] ${mCategory} lovs.xlsx`);

                // console.log(sanitize(mCategory))
        }
    }
}
}