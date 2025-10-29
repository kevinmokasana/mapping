/* eslint-disable */

import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import * as dotenv from 'dotenv'
dotenv.config()

import { DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, WRITE_DB_NAME, READ_DB_NAME } from './app.constants'
import { Attribute, ChannelAttribute, ChannelCategory, ChannelReferenceAttributes, ChannelReferenceMaster, CoreAttribute, CoreCategory, CoreChannelAttributeMappings, CoreChannelCategoryMapping, CoreReferenceAttributes, CoreReferenceMaster, CoreTenantAttributeMappings, CoreTenantCategoryMapping, TenantCategoryPath } from './tables.entity'
// console.log(process.env.DB_PASSWORD)
export const DatabaseConfig: TypeOrmModuleOptions = {
    type:  "postgres",
    username: String(DB_USER),
    password: String(DB_PASSWORD),
    port: parseInt(DB_PORT),
    host: DB_HOST,
    database: WRITE_DB_NAME,
    synchronize: false,
    entities:[CoreCategory, ChannelCategory, CoreAttribute, ChannelAttribute, CoreChannelCategoryMapping, CoreTenantCategoryMapping, TenantCategoryPath, CoreChannelAttributeMappings, CoreReferenceMaster, CoreReferenceAttributes, CoreAttribute, ChannelReferenceMaster, ChannelReferenceAttributes, ChannelAttribute, Attribute, CoreTenantAttributeMappings],
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
    entities:[CoreCategory, ChannelCategory, CoreAttribute, ChannelAttribute, CoreChannelCategoryMapping, CoreTenantCategoryMapping, TenantCategoryPath, CoreChannelAttributeMappings, CoreReferenceMaster, CoreReferenceAttributes, CoreAttribute, ChannelReferenceMaster, ChannelReferenceAttributes, ChannelAttribute, Attribute, CoreTenantAttributeMappings],
    logging:false
}