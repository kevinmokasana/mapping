/* eslint-disable */

import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import * as dotenv from 'dotenv'
dotenv.config()
// console.log(process.env.DB_PASSWORD)
export const DatabaseConfig: TypeOrmModuleOptions = {
    type:  "postgres",
    username: String(process.env.DB_USER),
    password: String(process.env.DB_PASSWORD),
    port: parseInt(process.env.DB_PORT),
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    synchronize: false,
    entities:[],
    logging:false
}

export const ReadDatabaseConfig: TypeOrmModuleOptions = {
    type:  "postgres",
    username: String(process.env.DB_USER),
    password: String(process.env.DB_PASSWORD),
    port: parseInt(process.env.DB_PORT),
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    synchronize: false,
    entities:[],
    logging:false
}