import { Injectable } from '@nestjs/common';
import { BulkUploadCategoryJsonData, MetaData } from './dto';
import * as fs from 'fs'
@Injectable()
export class CategoryCreation {

    async duplicateCheckBulkUpload2(data: BulkUploadCategoryJsonData[], type:`core` | `channel`) {

		const paths = data.sanitised_data.map(x => `${x['Category Path']}`)
		const duplicatePaths = (await this.tenantDataSource.manager.query(BulkUploadDuplicateTest(metaData, '', paths), paths)).map(x => x.path)
		let gethierarchy = GetHierarchyLevel(metaData);
		const tenantHierarchy = await this.tenantDataSource.manager.query(gethierarchy.query, gethierarchy.params);
		const level = tenantHierarchy[0].level

		let errorFile = new bulkUploadJSONData()
		errorFile.metadata = data.metadata
		errorFile.file_metadata = data.file_metadata
		errorFile.error_data = data.error_data
		errorFile.sanitised_data = []
		for (let i = 0; i < data.sanitised_data.length; i++) {
			if (data.sanitised_data[i]['Category Path'].split('>').length > level) {
				errorFile.error_data.push({
					...data.sanitised_data[i], ...{ error: `Maximum Level of Category must be less than or equal to ${level}` }
				})
			}
			else if (duplicatePaths.includes(data.sanitised_data[i]['Category Path'])) {
				errorFile.error_data.push({
					...data.sanitised_data[i], ...{ error: 'Category already exists' }
				})
			}
			else {
				errorFile.sanitised_data.push(data.sanitised_data[i])
			}
		}

		if (errorFile.error_data.length === 0)
			errorFile.error_data = null

		const path = s3path.split('.')[0]
		const fileName = path.split('/')[path.split('/').length - 1].replace(/[^a-zA-Z0-9 ]/g, '').split(' ').join('_')
		const filePath = path.split('/').slice(0, -1).join('/');
		const newKey = filePath + '/' + fileName + '_error' + '.' + s3path.split('.')[1]
		const params = { Bucket: AWS_BUCKET_NAME, Key: newKey, Body: JSON.stringify(errorFile) };
		const fileData = await sThree.upload(params).promise()
		const url = fileData.Location
		const response = await this.grpcServices.errorFileUpload({ url: url, uid: uid, tenant_id: metaData.tenant_id, org_id: metaData.org_id }, metaData)
		return errorFile

	}

    async bulkUploadCategoryPathTemaplateAPI(type:`core` | `channel`, metaData:MetaData) {
        let fileName = type===`core` ? `CoreCategory.json` : `ChannelCategory.json`
		let jsonData:BulkUploadCategoryJsonData[] = JSON.parse(fs.readFileSync(fileName).toString())
		let read = await this.duplicateCheckBulkUpload2(jsonData, type)
		let category2DArray = {}

		let data = jsonData
		let pathArray = data.map(x => x['Category Path'])
		await this.tenantDataSource.manager.transaction(async (entityManager) => {
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
							const x = new TenantCategory()
							x.category_name = category2DArrayWithSubArraysRemoved[i][j].trim()
							x.parent_id = ids[ids.length - 1]
							x.depth = j
							x.tenant_id = tenantId
							x.org_id = orgId
							x['lang_code'] = 'en'
							if (j === category2DArrayWithSubArraysRemoved[i].length - 1) x.is_leaf = true
							else x.is_leaf = false
							let siblings: TenantCategory[]
							if (ids[ids.length - 1] === null)
								siblings = (await entityManager.query(`SELECT category_name,id FROM tenant_category WHERE parent_id is null AND tenant_id = $1 AND org_id=$2 and deleted_at is null`, [tenantId, orgId]))
							else
								siblings = (await entityManager.query(`SELECT category_name,id FROM tenant_category WHERE parent_id = ${ids[ids.length - 1]} AND tenant_id = $1 AND org_id=$2 and deleted_at is null`, [tenantId, orgId]))

							if (x.parent_id != null)
								await entityManager.query(UpdateIsLeafToFalse(metadata, x.parent_id))
							const categoryExists = siblings.find(x => x.category_name === category2DArrayWithSubArraysRemoved[i][j].trim())
							// const saved = (categoryExists === undefined) ? await this.translationService.createEntity(x, 'tenant_category', entityManager, this.googleTranslator) : { response: categoryExists }
							const saved = (categoryExists === undefined) ? await this.saveCategory2(entityManager, metadata, x.category_name, x.description, x.parent_id, x.depth, x.is_leaf, x.is_active, x.inherited_from_core_id, x.root_category_id,'en',0) : categoryExists
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
		});
		return this.responseObject(SUCCESS, 201, 'Added Successfully', [])
	}
}
