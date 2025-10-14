import { HttpException, Injectable } from '@nestjs/common';
import { BulkUploadCategoryJsonData, MetaData } from './dto';
import * as fs from 'fs'
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { ChannelCategory, CoreCategory } from './tables.entity';
import * as dotenv from 'dotenv'
import { WRITE_DB_NAME } from './app.constants';
dotenv.config()
@Injectable()
export class CategoryCreation {

    constructor(
        @InjectDataSource(WRITE_DB_NAME) private dataSource:DataSource
    ){}

    // async duplicateCheckBulkUpload2(data: BulkUploadCategoryJsonData[], type:`core` | `channel`) {

	// 	const paths = data.sanitised_data.map(x => `${x['Category Path']}`)
	// 	const duplicatePaths = (await this.tenantDataSource.manager.query(BulkUploadDuplicateTest(metaData, '', paths), paths)).map(x => x.path)
	// 	let gethierarchy = GetHierarchyLevel(metaData);
	// 	const tenantHierarchy = await this.tenantDataSource.manager.query(gethierarchy.query, gethierarchy.params);
	// 	const level = tenantHierarchy[0].level

	// 	let errorFile = new bulkUploadJSONData()
	// 	errorFile.metadata = data.metadata
	// 	errorFile.file_metadata = data.file_metadata
	// 	errorFile.error_data = data.error_data
	// 	errorFile.sanitised_data = []
	// 	for (let i = 0; i < data.sanitised_data.length; i++) {
	// 		if (data.sanitised_data[i]['Category Path'].split('>').length > level) {
	// 			errorFile.error_data.push({
	// 				...data.sanitised_data[i], ...{ error: `Maximum Level of Category must be less than or equal to ${level}` }
	// 			})
	// 		}
	// 		else if (duplicatePaths.includes(data.sanitised_data[i]['Category Path'])) {
	// 			errorFile.error_data.push({
	// 				...data.sanitised_data[i], ...{ error: 'Category already exists' }
	// 			})
	// 		}
	// 		else {
	// 			errorFile.sanitised_data.push(data.sanitised_data[i])
	// 		}
	// 	}

	// 	if (errorFile.error_data.length === 0)
	// 		errorFile.error_data = null

	// 	const path = s3path.split('.')[0]
	// 	const fileName = path.split('/')[path.split('/').length - 1].replace(/[^a-zA-Z0-9 ]/g, '').split(' ').join('_')
	// 	const filePath = path.split('/').slice(0, -1).join('/');
	// 	const newKey = filePath + '/' + fileName + '_error' + '.' + s3path.split('.')[1]
	// 	const params = { Bucket: AWS_BUCKET_NAME, Key: newKey, Body: JSON.stringify(errorFile) };
	// 	const fileData = await sThree.upload(params).promise()
	// 	const url = fileData.Location
	// 	const response = await this.grpcServices.errorFileUpload({ url: url, uid: uid, tenant_id: metaData.tenant_id, org_id: metaData.org_id }, metaData)
	// 	return errorFile

	// }



    async bulkUploadCategory(type:`core` | `channel`, channelId?:number) {
        let fileName = type===`core` ? `CoreCategory.json` : `ChannelCategory.json`
		let jsonData:BulkUploadCategoryJsonData[] = JSON.parse(fs.readFileSync(fileName).toString())
		let category2DArray = {}
		let data = jsonData
		console.log('-------------');
		
		console.log(data);
		console.log('-------------');
		
		
		let pathArray = data.map(x => x['Category Path'])
		await this.dataSource.manager.transaction(async (entityManager) => {
			try {
				let checkDepth = false;
				if (checkDepth) {
				} else {
					pathArray.sort()

					for (let i = 0; i < pathArray.length; i++) {
						category2DArray[i] = pathArray[i].split('>')
					}
					const category2DArrayWithSubArraysRemoved = await this.removeSubArrays(category2DArray)
					let sameParentLevel: number = 0
					let ids: number[] = [null];
					for (let i = 0; i < Object.keys(category2DArrayWithSubArraysRemoved).length; i++) {
						if (i != 0) {
							while (JSON.stringify(category2DArrayWithSubArraysRemoved[i].slice(0, sameParentLevel)) != JSON.stringify(category2DArrayWithSubArraysRemoved[i - 1].slice(0, sameParentLevel))) {
								sameParentLevel--
							}
							while (JSON.stringify(category2DArrayWithSubArraysRemoved[i].slice(0, sameParentLevel + 1)) === JSON.stringify(category2DArrayWithSubArraysRemoved[i - 1].slice(0, sameParentLevel + 1))) {
								sameParentLevel++
							}

							while (ids.length != (sameParentLevel + 1)) ids.pop()
							if (sameParentLevel === 0) ids = [null]
						}
						for (let j = sameParentLevel; j < category2DArrayWithSubArraysRemoved[i].length; j++) {
							const x = type===`core` ? new CoreCategory() : new ChannelCategory()
							x.category_name = category2DArrayWithSubArraysRemoved[i][j].trim()
							x.parent_id = ids[ids.length - 1]
							x.depth = j
							x['lang_code'] = 'en'
							if (j === category2DArrayWithSubArraysRemoved[i].length - 1) x.is_leaf = true
							else x.is_leaf = false
							let siblings: CoreCategory[] | ChannelCategory[]
							if (ids[ids.length - 1] === null)
								siblings = await this.getSiblings(null, type, entityManager, channelId)
							else
								siblings = await this.getSiblings(ids[ids.length - 1], type, entityManager, channelId)//(await entityManager.query(`SELECT category_name,id FROM tenant_category WHERE parent_id = ${ids[ids.length - 1]} AND tenant_id = $1 AND org_id=$2 and deleted_at is null`, [tenantId, orgId]))

							if (x.parent_id != null)
                                await this.updateIsLeafToFalse(x.parent_id, type, entityManager, channelId)
							const categoryExists = siblings.find(x => x.category_name === category2DArrayWithSubArraysRemoved[i][j].trim())
							const saved = (categoryExists === undefined) ? await this.saveCategory(x, entityManager) : categoryExists
							if (saved['status'] === 'error')
								throw new HttpException(saved['message'], 201)
							if (j != category2DArrayWithSubArraysRemoved[i].length - 1) ids.push(saved.id)
						}
					}

				}

			} catch (e) {
				console.log(e)
				throw new HttpException(e.message, 201)
			}
            const tableName = type===`core` ? `core_categories` : `channel_categories`
            const selectColumn = type===`core` ? `` : `, channel_id`
            const selectColumn2 = type===`core` ? `` : `, o.channel_id`
            const joinColumn = type===`core` ? `` : ` and n.channel_id = o.channel_id`

            const paths:{id:number, path:string}[] = await entityManager.query(`
                WITH RECURSIVE NODES (id, path, id_path, is_leaf) as (
                    select id, category_name, CAST(id AS varchar), is_leaf ${selectColumn}
                    from ${tableName}
                    where parent_id isnull
                    UNION ALL
                    select o.id, concat(path,'/',o.category_name),concat(id_path,'/',CAST(o.id AS varchar)), o.is_leaf ${selectColumn2}
                    from ${tableName} o
                    join nodes n on n.id = o.parent_id ${joinColumn})
                    select id, path, id_path from nodes
                    where is_leaf=true     
            `)
            if(type==='core'){
                await entityManager.query(`UPDATE core_categories SET category_path = null`)
                for(let path of paths){
					console.log(path)
                    await entityManager.getRepository(CoreCategory).update({
                        id:path.id
                    }, {
                        category_path:path.path
                    })
                }
            }else{
                await entityManager.query(`UPDATE channel_categories SET category_path = null where channel_id = ${channelId}`)
                for(let path of paths){
                    await entityManager.getRepository(ChannelCategory).update({
                        id:path.id,
                        channel_id:channelId
                    }, {
                        category_path:path.path
                    })
                }
            }
		});
		return {}//this.responseObject(SUCCESS, 201, 'Added Successfully', [])
	}

    async saveCategory(category:CoreCategory | ChannelCategory, entityManager:EntityManager){
        return await entityManager.save(category)
    }

    async updateIsLeafToFalse(categoryId:number, type:`core` | `channel`, entityManager:EntityManager, channelId?:number){
        const entity = type===`core` ?
            await entityManager.getRepository(CoreCategory).update({
                id:categoryId
            }, {
                is_leaf:false
            }):
            await entityManager.getRepository(ChannelCategory).update({
                id:categoryId,
                channel_id:channelId
            }, {
                is_leaf:false
            })
        return entity
    }

    async getSiblings(categoryId:number, type:`core` | `channel`, entityManager:EntityManager, channelId?:number){
        const siblings = type===`core` ?
            await entityManager.getRepository(CoreCategory).find({
                where:{
                    parent_id:categoryId,
                },
                select:['category_name', 'id']
            }):
            await entityManager.getRepository(ChannelCategory).find({
                where:{
                    parent_id:categoryId,
                    channel_id:channelId
                },
                select:['category_name', 'id']
            })
        return siblings
    }

    async removeSubArrays(array: any) {
		try {
			let removedSubArrays = {}
			let k = 0
			// console.log(array)
			for (let i = 0; i < Object.keys(array).length - 1; i++) {
				const isSubArray = array[i].every(val => array[i + 1].includes(val))
				if (!isSubArray) {
					removedSubArrays[k] = array[i]
					k++
				}
			}
			removedSubArrays[k] = array[Object.keys(array).length - 1]
			return removedSubArrays
		} catch (e) {
			throw e
		}

	}
}
