import { Controller, Get, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { CategoryCreation } from './category.creation.service';
import { ExcelToJson } from './exceltojson.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';


@Controller()
export class AppController {
    constructor(
        private readonly categoryCreation: CategoryCreation,
        private readonly excelToJson: ExcelToJson
    ) {}

    @Post('core-creation')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'core', maxCount: 1 },
    ]))
    async coreCreation(@UploadedFiles() files: { products: Express.Multer.File[]}){
        
    }

    // @SetMetadata('roles',{"module":'product',"subModule":'governance',"action":'view_governance'})
    // @UseGuards(AuthGuard)
	// @ApiResponse({ status: 201, type: GetAllProductsResponseDto })
	// @ApiExtension(X_AMAZON_APIGATEWAY_INTEGRATION, PRODUCT_POST_EXTENSION('upload-master-template'))
	// @Post('upload-master-template')
    // @UseInterceptors(FileFieldsInterceptor([
    //     { name: 'products', maxCount: 1 },
    // ]))
	// async uploadMasterTemplate(@Token() metaData: MetaData, @UploadedFiles() files: { products?: Express.Multer.File[] } ) {    
	// 	try{
    //         return await this.skuImplementationService.masterTemplateBulkUpload(files.products, metaData)
	// 	}catch(e) {
	// 		console.log(`API: upload-master-template || Error: ${JSON.stringify(e)} || StackTrace: ${JSON.stringify(e.stack)}`);
	// 		throw new HttpException(e.message, e.status || 500)
	// 	}
	// }

  
}
