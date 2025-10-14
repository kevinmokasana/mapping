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

export class BulkUploadCategoryAttributeMappingJSONData{
    'Category Path':string
    'Attribute Name':string
    'Mandatory':boolean
}

export class BulkUploadCatMappingJSONData{
    'Core Category Path'?:string
    'Channel Category Path'?:string
    'Tenant Category Path'?:string
}

export class BulkUploadAttributeMappingJSONData{
    'Core Attribute Name':string
    'Channel Attribute Name':string
    'Core Category Path':string
    'Channel Category Path':string
}

export class BulkUploadAttributeJSONData{
    'attribute_name':string
    'attribute_type':string
    'attribute_data_type':string
    'short_name':string
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

export class BulkUploadLovJSONData{
    'Category Path':string
    'Attribute Name':string
    'Reference Value':string
}

