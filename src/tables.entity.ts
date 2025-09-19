import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';

// @Entity('attributes')
// export class Attribute {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @PrimaryColumn({ name: 'tenant_id' })
//   tenant_id: string;

//   @PrimaryColumn({ name: 'org_id' })
//   org_id: string;

//   @Column({ name: 'attribute_db_name', nullable: true })
//   attribute_db_name: string;

//   @Column({ name: 'attribute_name' })
//   attribute_name: string;

//   @Column({ name: 'short_name', nullable: true })
//   short_name: string;

//   @Column({ name: 'display_name' })
//   display_name: string;

//   @Column({ nullable: true, name: 'label_description' })
//   label_description: string;

//   @Column({ name: 'attribute_type' })
//   attribute_type: string;

//   @Column({ name: 'attribute_data_type' })
//   attribute_data_type: string;

//   @Column({ default: 100 })
//   length: number;

//   @Column()
//   mandatory: boolean;

//   @Column({ default: true, nullable: true })
//   auto_translate: boolean;

//   @Column({ name: 'pricing', nullable: true })
//   pricing: boolean;

//   @Column({ default: false, nullable: true })
//   filter: boolean;

//   @Column({ default: true })
//   editable: boolean;

//   @Column({ default: true })
//   visibility: boolean;

//   @Column({ default: true })
//   searchable: boolean;

//   @Column({ default: null, nullable: true })
//   constraint: boolean;

//   @Column({ nullable: true, name: 'master_id' })
//   master_id: number;

//   @Column({ nullable: true, name: 'attribute_group_id' })
//   attribute_group_id: number;

//   @Column({ nullable: true, name: 'reference_master_id' })
//   reference_master_id: number;

//   @Column({ nullable: true, name: 'reference_attribute_id' })
//   reference_attribute_id: number;

//   @Column({ nullable: true, name: 'quantifier_master_id' })
//   quantifier_master_id: number;

//   @Column({ nullable: true, name: 'quantifier_attribute_id' })
//   quantifier_attribute_id: number;

//   @Column()
//   status: boolean;

//   @Column({ name: 'created_by', nullable: true })
//   created_by: string;

//   @Column({ name: 'updated_by', nullable: true })
//   updated_by: string;

//   @CreateDateColumn({
//     type: 'timestamp',
//     default: () => 'CURRENT_TIMESTAMP(6)',
//   })
//   public created_at: Date;

//   @UpdateDateColumn({
//     type: 'timestamp',
//     default: () => 'CURRENT_TIMESTAMP(6)',
//     onUpdate: 'CURRENT_TIMESTAMP(6)',
//   })
//   public updated_at: Date;

//   @DeleteDateColumn({ type: 'timestamptz', nullable: true })
//   deleted_at: Date;

//   @Column({ name: 'deleted_by', nullable: true })
//   deleted_by: string;

//   // @OneToMany(() => ProductAssignment, productAssignment => productAssignment.attribute)
//   // productAssignments : ProductAssignment[];

//   @ManyToOne(() => Master, (master) => master.attributes)
//   @JoinColumn([
//     { name: 'master_id', referencedColumnName: 'id' },
//     { name: 'tenant_id', referencedColumnName: 'tenant_id' },
//     { name: 'org_id', referencedColumnName: 'org_id' },
//   ])
//   master: Master;

//   @ManyToOne(
//     () => ReferenceMaster,
//     (referenceMaster) => referenceMaster.attributes,
//   )
//   @JoinColumn([
//     { name: 'reference_master_id', referencedColumnName: 'id' },
//     { name: 'tenant_id', referencedColumnName: 'tenant_id' },
//     { name: 'org_id', referencedColumnName: 'org_id' },
//   ])
//   referenceMaster: ReferenceMaster;

//   @ManyToOne(
//     () => ReferenceMaster,
//     (referenceMaster) => referenceMaster.quantifierattributes,
//   )
//   @JoinColumn([
//     { name: 'quantifier_master_id', referencedColumnName: 'id' },
//     { name: 'tenant_id', referencedColumnName: 'tenant_id' },
//     { name: 'org_id', referencedColumnName: 'org_id' },
//   ])
//   quantifierMaster: ReferenceMaster;

//   @ManyToOne(
//     () => ReferenceAttributes,
//     (referenceAttributes) => referenceAttributes.attributes,
//   )
//   @JoinColumn([
//     { name: 'quantifier_attribute_id', referencedColumnName: 'id' },
//     { name: 'tenant_id', referencedColumnName: 'tenant_id' },
//     { name: 'org_id', referencedColumnName: 'org_id' },
//   ])
//   quantifierAttribute: ReferenceAttributes;

//   @ManyToOne(
//     () => AttributeGroup,
//     (attributeGroup) => attributeGroup.attributes,
//   )
//   @JoinColumn([
//     { name: 'attribute_group_id', referencedColumnName: 'id' },
//     { name: 'tenant_id', referencedColumnName: 'tenant_id' },
//     { name: 'org_id', referencedColumnName: 'org_id' },
//   ])
//   attributeGroup: AttributeGroup;

//   @ManyToOne(() => DataTypes, (dataType) => dataType.referenceAttributes)
//   @JoinColumn({
//     name: 'attribute_data_type',
//     referencedColumnName: 'data_type',
//   })
//   dataType: DataTypes;

//   @ManyToOne(() => Types, (type) => type.attributes)
//   @JoinColumn({ name: 'attribute_type', referencedColumnName: 'type' })
//   type: Types;
// }

// @Entity('reference_masters')
// export class ReferenceMaster {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @PrimaryColumn({ name: 'tenant_id' })
//   tenant_id: string;

//   @PrimaryColumn({ name: 'org_id' })
//   org_id: string;

//   @Column({ name: 'master_entity_name' })
//   master_entity_name: string;

//   @Column({ name: 'master_entity_type', default: 'reference_master' })
//   master_entity_type: string;

//   @Column({ name: 'master_entity_description', nullable: true })
//   master_entity_description: string;

//   @Column({ name: 'pdm_status', default: 'yetToGenerate' })
//   pdm_status: string;

//   @Column({ name: 'entities', nullable: true })
//   entities: number;

//   @Column({ name: 'status', default: true })
//   status: boolean;

//   @Column({ name: 'created_by' })
//   created_by: string;

//   @Column({ name: 'updated_by' })
//   updated_by: string;

//   @CreateDateColumn({
//     type: 'timestamp',
//     default: () => 'CURRENT_TIMESTAMP(6)',
//     name: 'created_at',
//   })
//   public created_at: Date;

//   @UpdateDateColumn({
//     type: 'timestamp',
//     default: () => 'CURRENT_TIMESTAMP(6)',
//     onUpdate: 'CURRENT_TIMESTAMP(6)',
//     name: 'updated_at',
//   })
//   public updated_at: Date;

//   @DeleteDateColumn({ type: 'timestamptz', nullable: true })
//   deleted_at: Date;

//   @Column({ name: 'deleted_by', nullable: true })
//   deleted_by: string;

//   @OneToMany(() => Attribute, (attribute) => attribute.referenceMaster)
//   attributes: Attribute[];

//   @OneToMany(() => Attribute, (attribute) => attribute.quantifierMaster)
//   quantifierattributes: Attribute[];

//   @OneToMany(
//     () => ReferenceAttributes,
//     (referenceAttributes) => referenceAttributes.referenceMaster,
//   )
//   referenceAttributes: ReferenceAttributes[];
// }

// @Entity('reference_attributes')
// export class ReferenceAttributes {
//   @PrimaryGeneratedColumn()
//   id: number;

//   @PrimaryColumn({ name: 'tenant_id' })
//   tenant_id: string;

//   @PrimaryColumn({ name: 'org_id' })
//   org_id: string;

//   @Column({ name: 'attribute_db_name', nullable: true })
//   attribute_db_name: string;

//   @Column({ name: 'attribute_name' })
//   attribute_name: string;

//   @Column({ name: 'short_name', nullable: true })
//   short_name: string;

//   @Column({ name: 'display_name' })
//   display_name: string;

//   @Column({ nullable: true, name: 'label_description' })
//   label_description: string;

//   @Column({ name: 'attribute_type' })
//   attribute_type: string;

//   @Column({ default: 100 })
//   length: number;

//   @Column({ default: false })
//   mandatory: boolean;

//   @Column({ default: true, nullable: true })
//   auto_translate: boolean;

//   @Column({ default: false })
//   unique: boolean;

//   @Column({ default: false, nullable: true })
//   filter: boolean;

//   @Column({ default: true })
//   editable: boolean;

//   @Column({ default: true })
//   visibility: boolean;

//   @Column({ default: true })
//   searchable: boolean;

//   @Column({ nullable: true, name: 'reference_master_id' })
//   reference_master_id: number;

//   @Column({ default: true })
//   status: boolean;

//   @Column({ name: 'created_by' })
//   created_by: string;

//   @Column({ name: 'updated_by' })
//   updated_by: string;

//   @CreateDateColumn({
//     type: 'timestamp',
//     default: () => 'CURRENT_TIMESTAMP(6)',
//     name: 'created_at',
//   })
//   public created_at: Date;

//   @UpdateDateColumn({
//     type: 'timestamp',
//     name: 'updated_at',
//     default: () => 'CURRENT_TIMESTAMP(6)',
//     onUpdate: 'CURRENT_TIMESTAMP(6)',
//   })
//   public updated_at: Date;

//   @DeleteDateColumn({ type: 'timestamptz', nullable: true })
//   deleted_at: Date;

//   @Column({ name: 'deleted_by', nullable: true })
//   deleted_by: string;

//   @ManyToOne(
//     () => ReferenceMaster,
//     (referenceMaster) => referenceMaster.referenceAttributes,
//   )
//   @JoinColumn([
//     { name: 'reference_master_id', referencedColumnName: 'id' },
//     { name: 'tenant_id', referencedColumnName: 'tenant_id' },
//     { name: 'org_id', referencedColumnName: 'org_id' },
//   ])
//   referenceMaster: ReferenceMaster;

//   @ManyToOne(() => DataTypes, (dataType) => dataType.referenceAttributes)
//   @JoinColumn([{ name: 'attribute_type', referencedColumnName: 'data_type' }])
//   dataType: DataTypes;

//   @OneToMany(() => Attribute, (attribute) => attribute.quantifierAttribute)
//   attributes: Attribute[];
// }

// @Entity('reference_master_data')
// export class ReferenceMasterData {
//   @PrimaryColumn()
//   rmdm_id: number;

//   @PrimaryColumn()
//   rm_id: number;

//   @PrimaryColumn()
//   ra_id: number;

//   @Column({ nullable: true })
//   value: string;

//   @PrimaryColumn({ name: 'tenant_id' })
//   tenant_id: string;

//   @PrimaryColumn({ name: 'org_id' })
//   org_id: string;

//   @Column({ default: true })
//   status: boolean;

//   @Column({ nullable: true })
//   listing_status: string;

//   @Column({ nullable: true })
//   error_message: string;

//   @Column({ name: 'created_by', nullable: true })
//   created_by: string;

//   @Column({ name: 'updated_by', nullable: true })
//   updated_by: string;

//   @CreateDateColumn({
//     type: 'timestamp',
//     default: () => 'CURRENT_TIMESTAMP(6)',
//     name: 'created_at',
//   })
//   public created_at: Date;

//   @Column({ name: 'updated_at', nullable: true })
//   public updated_at: Date;

//   @DeleteDateColumn({ type: 'timestamptz', nullable: true })
//   deleted_at: Date;

//   @Column({ name: 'deleted_by', nullable: true })
//   deleted_by: string;
// }

@Entity('core_categories')
export class CoreCategory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    category_name: string;

    @Column({ nullable: true })
    parent_id: number;

    @Column({ nullable: true })
    depth: number;

    @Column({ nullable: true })
    is_leaf: boolean;

    @Column({ nullable: true })
    category_path: string;
}

@Entity('channel_categories')
export class ChannelCategory {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    category_name: string;

    @Column({ nullable: true })
    parent_id: number;

    @Column({ nullable: true })
    depth: number;

    @Column({ nullable: true })
    is_leaf: boolean;

    @Column({ nullable: true })
    category_path: string;

    @Column({ nullable: true })
    channel_id: number;
}

@Entity('core_tenant_category_mappings')
export class CoreTenantCategoryMapping {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    tenant_category_id: number;

    @Column()
    core_category_id: number;

    @Column()
    tenant_id: string;

    @Column()
    org_id: string;    
}

@Entity('core_channel_category_mappings')
export class CoreChannelCategoryMapping {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    channel_category_id: number;
    
    @Column()
    core_category_id: number;
}

@Entity('tenant_category_paths')
export class TenantCategoryPath {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    tenant_id: string;

    @Column()
    org_id: string;

    @Column()
    category_path: string;

    @Column()
    id_path: number[]

}

@Entity('core_attributes')
export class CoreAttribute {

    @PrimaryGeneratedColumn()
    id: number;
    
    @Column({name :"attribute_db_name", nullable: true})
    attribute_db_name: string;

    @Column({name :"attribute_name"})
    attribute_name: string;

    @Column({name:"short_name", nullable: true})
    short_name: string;

    @Column({name:"display_name"})
    display_name: string;

    @Column({nullable: true, name: "label_description"})
    label_description: string;

    @Column({name :"attribute_type"})
    attribute_type: string;

    @Column({name :"attribute_data_type"})
    attribute_data_type: string;

    @Column({ default :100 })
    length: number;

    @Column()
    mandatory: boolean;

    @Column({ default :false, nullable: true })
    filter: boolean;

    @Column({default: true})
    editable: boolean;

    @Column({default: true})
    visibility: boolean;

    @Column({default: true})
    searchable: boolean;

    @Column({ default :null, nullable: true })
    constraint: boolean;

    @Column({nullable: true, name:"attribute_group_id"})
    attribute_group_id: number;

    @Column({nullable: true, name:"reference_master_id"})
    reference_master_id: number;

    @Column({nullable: true, name:"reference_attribute_id"})
    reference_attribute_id: number;

    @Column({nullable: true, name:"quantifier_master_id"})
    quantifier_master_id: number;

    @Column({nullable: true, name:"quantifier_attribute_id"})
    quantifier_attribute_id: number;

    @Column()
    status: boolean;

    @Column({ name:"created_by",nullable: true })
    created_by: string;

    @Column({name:"updated_by",nullable: true})
    updated_by: string;

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
    public created_at: Date;
  
    @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
    public updated_at: Date;

    @DeleteDateColumn({ type: "timestamptz",  nullable:true})
    deleted_at: Date

    @Column({name:"deleted_by",  nullable:true})
    deleted_by: string;

}

@Entity("core_reference_masters")
export class CoreReferenceMaster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name :"master_entity_name" })
  master_entity_name: string;

  @Column({ name :"master_entity_type" , default : 'reference_master' })
  master_entity_type: string;

  @Column({ name :"master_entity_description", nullable : true })
  master_entity_description: string;

  @Column({ name:"status", default : true })
  status: boolean;

  @Column({name:"created_by"})
  created_by: string;

  @Column({name:"updated_by"})
  updated_by: string;

  @CreateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP(6)",
    name:"created_at"
  })
  public created_at: Date;

  @UpdateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP(6)",
    onUpdate: "CURRENT_TIMESTAMP(6)",
    name:"updated_at"
  })
  public updated_at: Date;

  @DeleteDateColumn({ type: "timestamptz",  nullable:true})
  deleted_at: Date

  @Column({name:"deleted_by",  nullable:true})
  deleted_by: string;

}

@Entity('core_reference_attributes')
export class CoreReferenceAttributes {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'attribute_db_name', nullable: true })
  attribute_db_name: string;

  @Column({ name: 'attribute_name' })
  attribute_name: string;

  @Column({ name: 'short_name', nullable: true })
  short_name: string;

  @Column({ name: 'display_name' })
  display_name: string;

  @Column({ nullable: true, name: 'label_description' })
  label_description: string;

  @Column({ name: 'attribute_type' })
  attribute_type: string;

  @Column({ default: 100 })
  length: number;

  @Column({ default: false })
  mandatory: boolean;

  @Column({ default: false })
  unique: boolean;

  @Column({ default: false, nullable: true })
  filter: boolean;

  @Column({ default: true })
  editable: boolean;

  @Column({ default: true })
  visibility: boolean;

  @Column({ default: true })
  searchable: boolean;

  @Column({ nullable: true, name: 'reference_master_id' })
  reference_master_id: number;

  @Column({ default: true })
  status: boolean;

  @Column({ name: 'created_by' })
  created_by: string;

  @Column({ name: 'updated_by' })
  updated_by: string;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    name: 'created_at',
  })
  public created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  public updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at: Date;

  @Column({ name: 'deleted_by', nullable: true })
  deleted_by: string;

}

@Entity('channel_attributes')
export class ChannelAttribute {

    @PrimaryGeneratedColumn()
    id: number;
    
    @Column({name :"attribute_db_name", nullable: true})
    attribute_db_name: string;

    @Column({name :"attribute_name"})
    attribute_name: string;

    @Column({name:"short_name", nullable: true})
    short_name: string;

    @Column({name:"display_name"})
    display_name: string;

    @Column({nullable: true, name: "label_description"})
    label_description: string;

    @Column({name :"attribute_type"})
    attribute_type: string;

    @Column({name :"attribute_data_type"})
    attribute_data_type: string;

    @Column({ default :100 })
    length: number;

    @Column()
    mandatory: boolean;

    @Column({ default :false, nullable: true })
    filter: boolean;

    @Column({default: true})
    editable: boolean;

    @Column({default: true})
    visibility: boolean;

    @Column({default: true})
    searchable: boolean;

    @Column({ default :null, nullable: true })
    constraint: boolean;

    @Column({nullable: true, name:"attribute_group_id"})
    attribute_group_id: number;

    @Column({nullable: true, name:"reference_master_id"})
    reference_master_id: number;

    @Column({nullable: true, name:"reference_attribute_id"})
    reference_attribute_id: number;

    @Column({nullable: true, name:"quantifier_master_id"})
    quantifier_master_id: number;

    @Column({nullable: true, name:"quantifier_attribute_id"})
    quantifier_attribute_id: number;

    @Column()
    status: boolean;

    @Column({ name:"created_by",nullable: true })
    created_by: string;

    @Column({name:"updated_by",nullable: true})
    updated_by: string;

    @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
    public created_at: Date;
  
    @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
    public updated_at: Date;

    @DeleteDateColumn({ type: "timestamptz",  nullable:true})
    deleted_at: Date

    @Column({name:"deleted_by",  nullable:true})
    deleted_by: string;

    @Column({ name: 'channel_id' })
    channel_id: number;

}

@Entity("channel_reference_masters")
export class ChannelReferenceMaster {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name :"master_entity_name" })
  master_entity_name: string;

  @Column({ name :"master_entity_type" , default : 'reference_master' })
  master_entity_type: string;

  @Column({ name :"master_entity_description", nullable : true })
  master_entity_description: string;

  @Column({ name:"status", default : true })
  status: boolean;

  @Column({name:"created_by"})
  created_by: string;

  @Column({name:"updated_by"})
  updated_by: string;

  @CreateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP(6)",
    name:"created_at"
  })
  public created_at: Date;

  @UpdateDateColumn({
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP(6)",
    onUpdate: "CURRENT_TIMESTAMP(6)",
    name:"updated_at"
  })
  public updated_at: Date;

  @DeleteDateColumn({ type: "timestamptz",  nullable:true})
  deleted_at: Date

  @Column({name:"deleted_by",  nullable:true})
  deleted_by: string;

  @Column({ name: 'channel_id' })
  channel_id: number;

}

@Entity('channel_reference_attributes')
export class ChannelReferenceAttributes {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'attribute_db_name', nullable: true })
  attribute_db_name: string;

  @Column({ name: 'attribute_name' })
  attribute_name: string;

  @Column({ name: 'short_name', nullable: true })
  short_name: string;

  @Column({ name: 'display_name' })
  display_name: string;

  @Column({ nullable: true, name: 'label_description' })
  label_description: string;

  @Column({ name: 'attribute_type' })
  attribute_type: string;

  @Column({ default: 100 })
  length: number;

  @Column({ default: false })
  mandatory: boolean;

  @Column({ default: false })
  unique: boolean;

  @Column({ default: false, nullable: true })
  filter: boolean;

  @Column({ default: true })
  editable: boolean;

  @Column({ default: true })
  visibility: boolean;

  @Column({ default: true })
  searchable: boolean;

  @Column({ nullable: true, name: 'reference_master_id' })
  reference_master_id: number;

  @Column({ default: true })
  status: boolean;

  @Column({ name: 'created_by' })
  created_by: string;

  @Column({ name: 'updated_by' })
  updated_by: string;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    name: 'created_at',
  })
  public created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    name: 'updated_at',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  public updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at: Date;

  @Column({ name: 'deleted_by', nullable: true })
  deleted_by: string;

  @Column({ name: 'channel_id' })
  channel_id: number;

}

