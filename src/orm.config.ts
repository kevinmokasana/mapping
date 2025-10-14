/* eslint-disable */

import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import * as dotenv from 'dotenv'
dotenv.config()

import { DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, WRITE_DB_NAME, READ_DB_NAME } from './app.constants'
import { ChannelAttribute, ChannelReferenceValues, CoreAttribute, CoreCategory, CoreReferenceValues } from './tables.entity'
// console.log(process.env.DB_PASSWORD)
export const DatabaseConfig: TypeOrmModuleOptions = {
    type:  "postgres",
    username: String(DB_USER),
    password: String(DB_PASSWORD),
    port: parseInt(DB_PORT),
    host: DB_HOST,
    database: WRITE_DB_NAME,
    synchronize: true,
    entities:[CoreReferenceValues],
    logging:false
}

export const ReadDatabaseConfig: TypeOrmModuleOptions = {
    type:  "postgres",
    username: String(DB_USER),
    password: String(DB_PASSWORD),
    port: parseInt(DB_PORT),
    host: DB_HOST,
    database: READ_DB_NAME,
    synchronize: false,
    entities:[],
    logging:false
}