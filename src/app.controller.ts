import { Controller, Get, Post } from '@nestjs/common';
import { CategoryCreation } from './category.creation.service';
import { ExcelToJson } from './exceltojson.service';


@Controller()
export class AppController {
    constructor(
        private readonly categoryCreation: CategoryCreation,
        private readonly excelToJson: ExcelToJson
    ) {}

    @Post()
    async coreCreation(){

    }

  
}
