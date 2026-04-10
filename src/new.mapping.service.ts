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
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
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
export class NewMappingService {

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

    async generateMappings(files:Express.Multer.File[], tenantId:string, orgId:string, marketplace:string, catmap:Express.Multer.File[], lovmap:Express.Multer.File[]){
        const excelFileName = catmap[0].originalname
        fs.writeFileSync(excelFileName, catmap[0].buffer)
        // let json
        let lovmapping
        if(lovmap.length!=0){
            fs.writeFileSync(lovmap[0].originalname, lovmap[0].buffer)
            let workbook1 = new ExcelJS.Workbook()
            await workbook1.xlsx.readFile(lovmap[0].originalname)
            lovmapping = await this.excelToJson.sheetToJson({ sheet:workbook1.worksheets[0], headerRowNumber:1})
        }
        
        const lovMapExcel = []
        let workbook1 = new ExcelJS.Workbook()
        await workbook1.xlsx.readFile(excelFileName)
        // const sheet = 
        let catMap = await this.excelToJson.sheetToJson({ sheet:workbook1.worksheets[0], headerRowNumber:1})
        // console.log(catMap)
        // const catMap = await this.excelToJson.sheetToJson
        const fileNames = []
        for(let file of files){
            const excelFileName = file.originalname
            fs.writeFileSync(excelFileName, file.buffer)
            fileNames.push(excelFileName)
        }  
        const channelId = await this.dataSource.query(`select * from subscribed_channels where channel_name = $1 and tenant_id = $2 and org_id = $3`, [marketplace, tenantId, orgId])

        const attributes:{attribute_name:string, attribute_db_name:string, constraint:boolean, rfs:{id:number, value:string}[]}[] = await this.dataSource.query(`
            with a as (
                SELECT * from attributes where deleted_at is null and attribute_db_name not in ('code_variants', 'mrp_variants', 'product_name_variants') and tenant_id = $1 and org_id = $2
            )
            select a.attribute_name, a.attribute_db_name, a.constraint, 
                json_agg(json_build_object('value', rmd.value, 'id', rmd.rmdm_id)) AS rfs
                --array_agg(rmd.value) as reference_values, array_agg(rmd.rmdm_id) as rvid 
            from a left join reference_master_data rmd on 
            a.reference_master_id = rmd.rm_id and 
            a.reference_attribute_id = rmd.ra_id
            group by a.attribute_name, a.attribute_db_name, a.constraint
        `, [tenantId, orgId])
        const marketplaceMetadata = mm[marketplace]
        for(let fileName of fileNames){
            let dropdown
            const workbook = new ExcelJS.Workbook()
            await workbook.xlsx.readFile(fileName)
            if(marketplaceMetadata.lovSheet!=undefined){
                dropdown = await this.excelToJson.sheetToJson({ sheet:workbook.getWorksheet(marketplaceMetadata.lovSheet), headerRowNumber:1})
            }
            // fs.writeFileSync(`xyxyxyxy.json`, JSON.stringify(dropdown))
            // console.log(dropdown)
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
                // console.log(catMap)
                const tenantCategoryPaths = catMap.filter(x=>{
                    return x[marketplace]==mCategory}).map(x=>x['PIM Categories'])
                const tenantCategoryIds = (await this.dataSource.manager.query(`
                    select id from tenant_category_paths where tenant_id = $1 and org_id = $2 and path = any($3)    
                `, [tenantId, orgId, tenantCategoryPaths])).map(x=>x.id)

                const mAttributeRow = sheet.getRow(marketplaceMetadata.mAttributeRow)
                const pAttributeRow = sheet.getRow(marketplaceMetadata.pimAttributeRow)
                const valueRow = sheet.getRow(marketplaceMetadata.valuesRow)
                let ftechLOVAttr
                if(marketplaceMetadata.attributesToFetchLOV!=undefined){
                    ftechLOVAttr = sheet.getRow(marketplaceMetadata.attributesToFetchLOV)
                }
                const attributeMapping = {}
                const missingAttributes = []
                const doubtAttributes = []
                const defaultValues = {}
                const lovMappings = {}
                const mandatory = []

                mAttributeRow.eachCell((cell, colNumber) => {
                    if (cell.value) {
                        let mAttribute = cell.value.toString().trim()
                        let fAttrLOV
                        if(ftechLOVAttr!=undefined){
                            console.log(ftechLOVAttr.getCell(colNumber).value)
                            fAttrLOV = ftechLOVAttr.getCell(colNumber).value?.toString()?.trim()
                            if(fAttrLOV?.includes(' (Refer LOV List)')) fAttrLOV = fAttrLOV?.replace(' (Refer LOV List)', '')
                        }
                        const pAttribute = typeof(pAttributeRow.getCell(colNumber).value)=='object' && pAttributeRow.getCell(colNumber).value!=null ? (pAttributeRow.getCell(colNumber).value['result']?.error==undefined ? (pAttributeRow.getCell(colNumber).value['result']):(pAttributeRow.getCell(colNumber).value['result']?.error)) : (pAttributeRow.getCell(colNumber).value?.toString()?.trim()) //pAttributeRow.getCell(colNumber).value?.toString()?.trim()
                        const value = valueRow.getCell(colNumber).value?.toString()?.trim()
                        const valueCell = valueRow.getCell(colNumber)
                        if(mAttribute=='*Product Groups'){
                            // console.log(valueCell.dataValidation.type)
                            // console.log(valueCell.dataValidation.formulae)
                        }
                        
                        if(pAttribute=='default'){
                            defaultValues[mAttribute] = value
                        }else if (pAttribute=='missing'){
                            if (valueCell.dataValidation?.type=='list') {
                                let formula = valueCell.dataValidation.formulae[0]
                                if(definedNames[formula]!=undefined){
                                    formula = definedNames[formula]
                                }
                                const dropdownValues = this.getLOVs(formula, workbook)
                                missingAttributes.push({
                                    attribute_name:mAttribute,
                                    dropdown:dropdownValues
                                })
                            }else{
                                missingAttributes.push({
                                    attribute_name:mAttribute
                                })
                            }
                        }else if (pAttribute=='#N/A'){

                        }
                        else if (pAttribute=='??'){
                            if (valueCell.dataValidation?.type=='list') {
                                let formula = valueCell.dataValidation.formulae[0]
                                if(definedNames[formula]!=undefined){
                                    formula = definedNames[formula]
                                }
                                const dropdownValues = this.getLOVs(formula, workbook)
                                doubtAttributes.push({
                                    attribute_name:mAttribute,
                                    dropdown:dropdownValues
                                })
                            }else{
                                doubtAttributes.push({
                                    attribute_name:mAttribute
                                })
                            }
                        }
                        else if(![null, undefined].includes(pAttribute)){
                            const attribute = attributes.find(x=>x.attribute_name==pAttribute)
                            if(attribute==undefined){
                                console.log(`Attribute ${pAttribute} does not exist in PIM`)
                            }
                            attributeMapping[mAttribute] = attribute?.attribute_db_name//pAttributeRow.getCell(colNumber).value.toString().trim()
                            mandatory.push(attribute.attribute_name)
                            if(dropdown != undefined){
                                // console.log(mAttribute)
                                // console.log(marketplaceMetadata.lovKey)
                                const lovValues = dropdown.filter(x=>x[marketplaceMetadata.lovKey]==fAttrLOV).map(x=>x[marketplaceMetadata.lovValue]).filter(x=>x!=null)
                                if(lovValues.length!=0){
                                    lovMappings[mAttribute] = {
                                        valuesToMap:lovValues
                                    }
                                    if(attribute.constraint){
                                        lovMappings[mAttribute]['ftechRf'] = attribute.attribute_db_name
                                        // lovMappings[mAttribute]['ra_id'] = attribute.
                                        // for(let rf of attribute.reference_values){
                                        //     lovMappings[mAttribute][rf] = ''
                                        // }
                                    }else{
                                        lovMappings[mAttribute]['takeRfFrom'] = attribute.attribute_db_name
                                    }
                                }
                            }
                            if (valueCell.dataValidation?.type=='list') {
                                let formula = valueCell.dataValidation.formulae[0]
                                if(definedNames[formula]!=undefined){
                                    formula = definedNames[formula]
                                }
                                const dropdownValues = this.getLOVs(formula, workbook)
                                lovMappings[mAttribute] = {
                                    valuesToMap:dropdownValues
                                }
                                if(attribute.constraint){
                                    lovMappings[mAttribute]['ftechRf'] = attribute.attribute_db_name
                                    // lovMappings[mAttribute]['ra_id'] = attribute.
                                    // for(let rf of attribute.reference_values){
                                    //     lovMappings[mAttribute][rf] = ''
                                    // }
                                }else{
                                    lovMappings[mAttribute]['takeRfFrom'] = attribute.attribute_db_name
                                }
                            }
                        }

                    }
                });

                for(let mAttribute in lovMappings){
                    if(lovMappings[mAttribute]['takeRfFrom']!=undefined){
                        const attributeDbName = lovMappings[mAttribute]['takeRfFrom']
                        const rfs = await this.dataSource.manager.query(`SELECT distinct product_data.product_data->>'${attributeDbName}' as rf from product_data where tenant_id = $1 and org_id = $2 and product_data.product_data->>'${attributeDbName}' is not null and category_id = any($3)`, [tenantId, orgId, tenantCategoryIds])
                        for(let rf of rfs){
                            lovMappings[mAttribute][rf.rf] = ''
                        }
                    }
                    if(lovMappings[mAttribute]['ftechRf']!=undefined){
                        const attributeDbName = lovMappings[mAttribute]['ftechRf']

                        const rfs = await this.dataSource.manager.query(`SELECT distinct product_data.product_data->>'${attributeDbName}' as rf from product_data where tenant_id = $1 and org_id = $2 and product_data.product_data->>'${attributeDbName}' is not null and category_id = any($3)`, [tenantId, orgId, tenantCategoryIds])
                        const ids = rfs.map(x=>x.rf)
                        const rfv = attributes.find(x=>x.attribute_db_name==attributeDbName).rfs.filter(x=>ids.includes(x.id?.toString())).map(x=>x?.value)
                        for(let rf of rfv){
                            lovMappings[mAttribute][rf] = ''
                        }

                    }
                }
                // console.log(lovMappings['Size'])
                if(lovmapping!=undefined){
                    for(let mAttribute in lovMappings){
                        for(let pimlov in lovMappings[mAttribute]){
                            const lovMap = lovmapping.find(x=>x['Channel Attribute']==mAttribute && x['PIM LOV']==pimlov)
                            console.log(lovMap)
                            if(lovMap!=undefined){
                                lovMappings[mAttribute][pimlov] = lovMap['Channel LOVs']
                            }
                            if(lovMappings[mAttribute][pimlov]==undefined){
                                lovMappings[mAttribute][pimlov] = ''
                            }
                        }
                    }
                }
                console.log(lovMappings['Size'])

                for(let mAttribute in lovMappings){
                    const pimAttribute = attributeMapping[mAttribute]
                    // console.log(lovMappings[mAttribute])
                    for(let value in lovMappings[mAttribute]){
                        if(value=='valuesToMap' || value=='ftechRf' || value=='takeRfFrom') continue
                        // if(`${lovMappings[mAttribute][`valuesToMap`]}`.length > 32767)
                        lovMapExcel.push({
                            'Channel Attribute':mAttribute,
                            'PIM Attribute':pimAttribute,
                            'Channel Category':mCategory,
                            'PIM LOV':value,
                            'Channel LOVs':'',
                            'Values to Map from':(`${lovMappings[mAttribute][`valuesToMap`]}`.length > 32767)?``:`${lovMappings[mAttribute][`valuesToMap`]}`,
                        })
                    }
                }


                // console.log(sanitize(mCategory))
                const marketPlaceCat = sanitize(mCategory).replaceAll(" ", "").replaceAll("-", "_")
                const chanelId = parseInt(channelId[0].channel_id)
                const existingMapping = await this.dataSource.manager.query(`
                    select myntra_category, channel_id, tenant_id from temp_channel_mappings where myntra_category = $1 and channel_id = $2 and tenant_id = $3    
                `, [marketPlaceCat, chanelId, tenantId])
                if(existingMapping.length!=0){
                    await this.dataSource.manager.query(`
                        UPDATE temp_channel_mappings SET pim_category = $1, default_values = $2, attribute_mappings = $3, lov_mappings = $4
                        WHERE myntra_category = $5 and channel_id = $6 and tenant_id = $7      
                    `, [tenantCategoryPaths, defaultValues, attributeMapping, lovMappings, marketPlaceCat, chanelId, tenantId])
                }else{
                    await this.dataSource.manager.query(`
                        INSERT INTO public.temp_channel_mappings(
                        tenant_id, org_id, lov_mappings, attribute_mappings, default_values, pim_category, myntra_category, order_by, channel_id)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);    
                    `, [tenantId, orgId, lovMappings, attributeMapping, defaultValues, tenantCategoryPaths, marketPlaceCat, null, chanelId])
                }
                fs.writeFileSync(`[${marketplace}] ${sanitize(mCategory)}.json`, JSON.stringify({
                    defaultValues, attributeMapping, lovMappings, channelId:channelId[0].channel_id, marketplaceCategory:marketPlaceCat, missingAttributes, doubtAttributes, tenantCategoryIds, tenantCategoryPaths
                , mandatory}, null, 2))
            }
            const removeDuplicatesByKeys = (arr, keys) => {
                const seen = new Map();
                return arr.filter(item => {
                    // Create a unique key string by combining the values of the specified keys
                    const compoundKey = keys.map(key => item[key]).join('||'); // Separator like '||' ensures key segments aren't merged (e.g., 'a', 'b', 'c' vs 'ab', 'c')
                    if (seen.has(compoundKey)) {
                        return false; // It's a duplicate
                    } else {
                        seen.set(compoundKey, true); // Mark this compound key as seen
                        return true; // Keep this item
                    }
                });
            };
            const dupRChannelLOV = removeDuplicatesByKeys(lovMapExcel, ["Channel Attribute", "Values to Map from", "PIM Attribute", "PIM LOV"])
            const workbookss = XLSX.utils.book_new();
            const worksheet1 = XLSX.utils.json_to_sheet(dupRChannelLOV);
            XLSX.utils.book_append_sheet(workbookss, worksheet1, "LOVMapping");
            XLSX.writeFile(workbookss, `[${marketplace}] LOVMapping.xlsx`);
        }
    }

    async fillAbsoluteCommonLovMappings(){
        const maps = await this.dataSource.manager.query(`select lov_mappings, myntra_category, channel_id, tenant_id, ai_lov_mappings, attribute_mappings from temp_channel_mappings`)
        for(let map of maps){
            const {lov_mappings, myntra_category, channel_id, tenant_id, attribute_mappings} = map
            for(let marketplaceAttr in lov_mappings){
                const pimAttr = attribute_mappings[marketplaceAttr]
                if(pimAttr==undefined) continue

                const lovMaps = lov_mappings[marketplaceAttr]
                for(let key in lovMaps){
                    if (lovMaps[key]=='') delete lovMaps[key]
                }
                console.log(lovMaps)

                await this.dataSource.manager.query(`INSERT INTO temp_absolute_common_lov_maps 
                    (tenant_id, org_id, channel_id, pim_attribute, channel_attribute, lov_mappings)
                    VALUES ($1, 'OR0001', $2, $3, $4, $5) 
                    on conflict (tenant_id, org_id, channel_id, pim_attribute, channel_attribute) do update set
                    lov_mappings = temp_absolute_common_lov_maps.lov_mappings || EXCLUDED.lov_mappings
                `, [tenant_id, channel_id, pimAttr, marketplaceAttr, lovMaps])
            }
        }
    }

    async getEmptyMappings(){
        const maps = await this.dataSource.manager.query(`select lov_mappings, myntra_category, channel_id, tenant_id, ai_lov_mappings, attribute_mappings from temp_channel_mappings`)
        for(let map of maps){
            const {myntra_category, channel_id, tenant_id, attribute_mappings, ai_lov_mappings} = map
            const missingLovs = {}
            for(let marketplaceattr in ai_lov_mappings){
                for(let value in ai_lov_mappings[marketplaceattr]){
                    if(ai_lov_mappings[marketplaceattr][value]=='' || ai_lov_mappings[marketplaceattr][value]=='Wrong Mapping'){
                        if(missingLovs[marketplaceattr]==undefined){
                            missingLovs[marketplaceattr] = {}
                        }
                        missingLovs[marketplaceattr][value] = ''
                    }
                    // lov_mappings[marketplaceattr]
                }
                if(missingLovs[marketplaceattr]!=undefined){
                    missingLovs[marketplaceattr]['valuesToMap']= ai_lov_mappings[marketplaceattr]['valuesToMap']
                }
            }
            console.log(missingLovs)
            await this.dataSource.manager.query(`update temp_channel_mappings set missing_lovs = $1 
                WHERE myntra_category = $2 and channel_id = $3 and tenant_id = $4`, [missingLovs, myntra_category, channel_id, tenant_id])
        }
    }

    async fillEmptyMappings(){
        const maps = await this.dataSource.manager.query(`select missing_lovs, lov_mappings, myntra_category, channel_id, tenant_id, ai_lov_mappings, attribute_mappings from temp_channel_mappings where missing_lovs is not null and missing_lovs <> '{}'`)
        fs.writeFileSync(`mappingBckup${Date.now()}`, JSON.stringify(maps))
        for(let map of maps){
            const {myntra_category, channel_id, tenant_id, attribute_mappings, ai_lov_mappings, missing_lovs} = map
            for(let marketAtt in missing_lovs){
                for(let mLov in missing_lovs[marketAtt]){
                    if(ai_lov_mappings[marketAtt]==undefined) continue
                    ai_lov_mappings[marketAtt][mLov] = missing_lovs[marketAtt][mLov]
                }
            }
            console.log(ai_lov_mappings)
            await this.dataSource.manager.query(`update temp_channel_mappings set ai_lov_mappings = $1 
                WHERE myntra_category = $2 and channel_id = $3 and tenant_id = $4`, [ai_lov_mappings, myntra_category, channel_id, tenant_id])
        }
    }

    async transferAiLovMappingsToMainLovMappings(){
        const maps = await this.dataSource.manager.query(`select lov_mappings, myntra_category, channel_id, tenant_id, ai_lov_mappings, attribute_mappings from temp_channel_mappings --limit 1`)
        fs.writeFileSync(`[1]FinalMappingBackup.json`, JSON.stringify(maps))
        const updatedMappings = []
        for(let map of maps){
            const {myntra_category, channel_id, tenant_id, attribute_mappings, ai_lov_mappings, lov_mappings} = map
            for(let marketplaceAttribute in ai_lov_mappings){
                if(marketplaceAttribute=='undefined'){
                    console.log(ai_lov_mappings[marketplaceAttribute])
                }
                for(let pimLovs in ai_lov_mappings[marketplaceAttribute]){
                    const marketplaceLov = ai_lov_mappings[marketplaceAttribute][pimLovs]
                    if(lov_mappings[marketplaceAttribute]==undefined){
                        lov_mappings[marketplaceAttribute] = {}
                    }
                    lov_mappings[marketplaceAttribute][pimLovs] = marketplaceLov
                }
            }
            updatedMappings.push({
                myntra_category, channel_id, tenant_id, lov_mappings
            })
        }
        // fs.writeFileSync(`UpdatedLOVMappings.json`, JSON.stringify(updatedMappings, null,2))
    }

    async updateLov(){
        const maps = await this.dataSource.manager.query(`select missing_lovs, lov_mappings, myntra_category, channel_id, tenant_id, ai_lov_mappings, attribute_mappings from temp_channel_mappings where missing_lovs is not null and missing_lovs <> '{}'`)
        fs.writeFileSync(`FinalMappingBckup${Date.now()}`, JSON.stringify(maps))
    //         "myntra_category": "SWEATBAND",
    // "channel_id": 455,
    // "tenant_id": "IND0038",
    // "lov_mappings": {}
        
        const data = JSON.parse(fs.readFileSync(`1updatedMappings.json`).toString())
        for(let d of data){
            const {myntra_category, channel_id, tenant_id, lov_mappings, attribute_mappings} = d
            await this.dataSource.manager.query(`
                update temp_channel_mappings set lov_mappings  = $1, attribute_mappings = $5 where  
                myntra_category = $2 and channel_id = $3 and tenant_id = $4   
            `, [lov_mappings, myntra_category, channel_id, tenant_id, attribute_mappings])
        }
    }

    async finalMappingsSarkhi(){
        const maps = await this.dataSource.manager.query(`select default_values, lov_mappings, myntra_category, channel_id, tenant_id, ai_lov_mappings, attribute_mappings from temp_channel_mappings`)
        const updatedMaps = []
        for(let map of maps){
            const {lov_mappings, myntra_category, channel_id, tenant_id, attribute_mappings, default_values} = map
            for(let mAttr in default_values){
                delete attribute_mappings[mAttr]
                delete lov_mappings[mAttr]
            }
            for(let mAttr in attribute_mappings){
                if (attribute_mappings[mAttr] == 'code_variants') attribute_mappings[mAttr] = 'code'
                if (attribute_mappings[mAttr] == 'product_name_variants') attribute_mappings[mAttr] = 'product_name'
                if (attribute_mappings[mAttr] == 'mrp_variants') attribute_mappings[mAttr] = 'mrp_4252'
            }
            updatedMaps.push({
                lov_mappings, attribute_mappings, channel_id, tenant_id, myntra_category
            })
        }
        fs.writeFileSync(`1updatedMappings.json`, JSON.stringify(updatedMaps))
    }

    async aiLOVMappings(){
        function sleep(ms:number) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        const ai = new GoogleGenAI({
            apiKey:'AIzaSyCtsZlS9rvQjFSNgPUk2vk8hPJJecME7hI'
        })
        const batchSize = 50
        const maps = await this.dataSource.manager.query(`select lov_mappings, myntra_category, channel_id, tenant_id, ai_lov_mappings, attribute_mappings from temp_channel_mappings where channel_id = 460`)
        for(let map of maps){
            const {lov_mappings, myntra_category, channel_id, tenant_id, attribute_mappings} = map
            let {ai_lov_mappings} = map
            for(let key in lov_mappings){
                if(key=='undefined') continue
                if(lov_mappings[key]['valuesToMap']==undefined || lov_mappings[key]['valuesToMap']==null) continue
                if(!Array.isArray(lov_mappings[key]['valuesToMap'])) lov_mappings[key]['valuesToMap'] = JSON.parse(lov_mappings[key]['valuesToMap'])
                const valToMapArr:string[] = lov_mappings[key]['valuesToMap'].filter(x=>x!='Multicolor').filter(x=>x!='Multi')
                const marketplaceLovs:any = [ ...new Set(valToMapArr)]
                delete lov_mappings[key]['valuesToMap']
                const pimLovObject = JSON.parse(JSON.stringify(lov_mappings[key]))
                const existingAiLovMappings = ai_lov_mappings!=null?(ai_lov_mappings[key] ?? {}):({})
                const batches = []
                let currentBatchSize = 0
                let currentBatch = {}
                const absoluteCommonLovMapRaw = await this.dataSource.manager.query(`select lov_mappings from temp_absolute_common_lov_maps where 
                    tenant_id = $1 and
                    org_id = 'OR0001' and
                    channel_id = $2 and
                    pim_attribute = $3 and
                    channel_attribute = $4    
                `, [tenant_id, channel_id, attribute_mappings[key], key])
                let absoluteCommonLovMap = {}
                if(absoluteCommonLovMapRaw.length!=0){
                    if(absoluteCommonLovMapRaw[0].lov_mappings!=null && absoluteCommonLovMapRaw[0].lov_mappings!=undefined){
                        absoluteCommonLovMap = absoluteCommonLovMapRaw[0].lov_mappings
                    }
                }
                for(let pimLov in pimLovObject){
                    if(!(existingAiLovMappings[pimLov]=='' || existingAiLovMappings[pimLov]==null || existingAiLovMappings[pimLov]==undefined)){
                        continue
                    }
                    const commonMap = absoluteCommonLovMap[pimLov] ?? ''
                    // console.log(`key: `,key)
                    // console.log(`commonmap: `, commonMap)
                    if(marketplaceLovs.includes(commonMap)){
                        if(ai_lov_mappings==null) ai_lov_mappings = {}
                        if(ai_lov_mappings[key]==undefined || ai_lov_mappings[key]==null) ai_lov_mappings[key] = {}
                        ai_lov_mappings[key][pimLov] = commonMap
                        continue
                    }
                    currentBatchSize++
                    currentBatch[pimLov] = pimLovObject[pimLov]
                    if(currentBatchSize>batchSize){
                        batches.push(JSON.parse(JSON.stringify(currentBatch)))
                        currentBatch = {}
                        currentBatchSize = 0
                    }
                }
                await this.dataSource.manager.query(`
                    UPDATE temp_channel_mappings SET ai_lov_mappings = $1
                    WHERE myntra_category = $2 and channel_id = $3 and tenant_id = $4      
                `, [ai_lov_mappings, myntra_category, channel_id, tenant_id])
                if(currentBatchSize>0){
                    batches.push(JSON.parse(JSON.stringify(currentBatch)))
                    currentBatch = {}
                    currentBatchSize = 0
                }
                const objectWithMappings = {}

                for(let batch of batches){
                    const startLoop = Date.now()
                    const zObject = {
                    }
                    for(let pim in batch){
                        zObject[pim] = z.string()//enum(marketplaceLovs)
                    }
                    const additionalNotes = key=='Secondary Color' ? `Important Note: As we are mapping Secondary Color, Take the color after / to map with marketplace` : ``
                    const prompt = `
                        Following are Flipkart LOVs for Category:${myntra_category} and Attribute: ${key}
                        ${additionalNotes}
                        LOVs: ${marketplaceLovs}
                        This is object with PIM LOVs as key and empty string as values Map these with Flipkart LOVs as values and return JSON object
                        ${JSON.stringify(batch)}
                        `;
                    // console.log(prompt)
                    const zSchema = z.object(zObject)
                    console.log(prompt)
                    // console.log(zodToJsonSchema(zSchema))
                    const response = await ai.models.generateContent({
                        model: "gemini-3.1-flash-lite-preview",
                        contents: prompt,
                        config: {
                            responseMimeType: "application/json",
                            responseJsonSchema: zodToJsonSchema(zSchema),
                        },
                    });
                    const result = zSchema.parse(JSON.parse(response.text));
                    // const result = {}
                    for(let map in result){
                        if(!marketplaceLovs.includes(result[map])){
                            result[map] = 'Wrong Mapping'
                        }
                    }
                    // Object.assign(objectWithMappings, result)
                    let [{ai_lov_mappings}] = await this.dataSource.manager.query(`select ai_lov_mappings from temp_channel_mappings WHERE myntra_category = $1 and channel_id = $2 and tenant_id = $3`, [myntra_category, channel_id, tenant_id])
                    if(ai_lov_mappings==null){
                        ai_lov_mappings = {}
                    }
                    if(ai_lov_mappings[key]==undefined){
                        ai_lov_mappings[key] = {}
                    }
                    Object.assign(ai_lov_mappings[key], result)
                    console.log(myntra_category,  ai_lov_mappings[key])
                    await this.dataSource.manager.query(`
                        UPDATE temp_channel_mappings SET ai_lov_mappings = $1
                        WHERE myntra_category = $2 and channel_id = $3 and tenant_id = $4      
                    `, [ai_lov_mappings, myntra_category, channel_id, tenant_id])
                    await this.dataSource.manager.query(`INSERT INTO temp_absolute_common_lov_maps 
                        (tenant_id, org_id, channel_id, pim_attribute, channel_attribute, lov_mappings)
                        VALUES ($1, 'OR0001', $2, $3, $4, $5) 
                        on conflict (tenant_id, org_id, channel_id, pim_attribute, channel_attribute) do update set
                        lov_mappings = temp_absolute_common_lov_maps.lov_mappings || EXCLUDED.lov_mappings
                    `, [tenant_id, channel_id, attribute_mappings[key], key, ai_lov_mappings[key]])
                    const endLoop = Date.now()
                    const time = endLoop - startLoop
                    if(time < 4500){
                        console.log(`SLEEP TIME:============`, (4500 - time))
                        await sleep(4500 - time)
                    }else {
                        console.log(`TOTAL TIME:============`, (time))
                    }   
                }
                objectWithMappings['valuesToMap'] = marketplaceLovs
                lov_mappings[key] = objectWithMappings
            }

        }
    }
}