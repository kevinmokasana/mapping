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

export class BulkUploadCatMappingJSONData{
    'Core Category Path':string
    'Channel Category Path':string
}

export class BulkUploadAttributeJSONData{
    'attribute_db_name':string
    'attribute_name':string
    'attribute_type':string
    'attribute_data_type':string
    'length':number
    'mandatory':boolean
    'unique':boolean
    'filter':boolean
    'editable':boolean
    'visibility':boolean
    'searchable':boolean
    'constraint':boolean
    'label_description':string
    'reference_master_name':string
    'reference_attribute_name':string
    'status':boolean
}

