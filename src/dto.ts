export class MetaData{
    tenant_id:string
    org_id:string
    user_id:string
    subscribed_products:string
    request_source?:string
    ip?:string
}

export class BulkUploadCategoryJsonData{
    'Category Path':string
}

export class bulkUploadCatMappingJSONData{
    'Core Category Path':string
    'Channel Category Path':string
}