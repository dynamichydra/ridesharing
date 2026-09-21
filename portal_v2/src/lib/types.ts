import { z } from "zod";

const makeZodEnum = <T extends string>(values: readonly T[]) => {
  return {
    values,
    schema: z.enum(values),
    type: undefined as unknown as T
  };
};

export type Condition = { key: string; value: string | number; operator: string }[];

export const ItemStatusDef = makeZodEnum([
  "active",
  "inactive",
] as const);
export type ItemStatus = typeof ItemStatusDef.type;
export const ItemStatusSchema = ItemStatusDef.schema;
export const itemStatusOptions = ItemStatusSchema.options;


export const ActionTypeDef = makeZodEnum([
  "approve", "delivery", "receive", "reject", "request", "damage", "manufacturing"
] as const);
export type ActionType = typeof ActionTypeDef.type;
export const ActionTypeSchema = ActionTypeDef.schema;
export const actionTypeOptions = ActionTypeSchema.options;


export const UserTypeDef = makeZodEnum([
  "Admin", "Sales", "BAT", "PMG", "Commercial", "Factory", "RDC"
] as const);
export type UserType = typeof UserTypeDef.type;
export const UserTypeSchema = UserTypeDef.schema;
export const UserTypeOptions = UserTypeSchema.options;

export type WhereOperator =
  | "is"
  | "isnot"
  | "higher"
  | "lower"
  | "higher-equal"
  | "lower-equal"
  | "in"
  | "notin"
  | "isnull"
  | "like";

export interface WhereCondition {
  key: string;
  operator: WhereOperator;
  value: string | number | boolean | Array<string | number>;
}

export type ReferenceType = "JOIN" | "LEFT JOIN" | "RIGHT JOIN";

export interface Reference {
  type: ReferenceType;
  obj: string;
  a: string;
  b: string;
}

export interface OrderOption {
  type: "ASC" | "DESC";
  by: string;
}

export type limit = {
  total: number;
  offset: number;
};

export interface QueryOptions {
  select?: string;
  where?: WhereCondition[];
  reference?: Reference[];
  limit?: limit
  order?: OrderOption;
  type?: string;
}

export type FilterOptions = {
  where: WhereCondition[];
  limit: {
    total: number;
    offset: number;
  };
};

export type FilterField = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: { value: string; label: string }[];
};

export type FilterConfig = FilterField[];

export const productTypes = [
  "1.00 MM",
  "0.80 MM",
  "RECON",
  "EGL",
  "Cubicle",
  "Sainik Laminates",
];

export const productTypesDef = makeZodEnum([
  "1.00 MM",
  "0.80 MM",
  "RECON",
  "EGL",
  "Cubicle",
  "Sainik Laminates",
] as const);
export type productTypesType = typeof RequetsForDef.type;
export const productTypesSchema = productTypesDef.schema;
export const productTypesOption = productTypesSchema.options;

export const RequetsForDef = makeZodEnum([
  "Influencer",
  "Retailer",
  "Distributor",
  "Dealer",
  "Scouting",
  "Owner",
] as const);
export type RequestForType = typeof RequetsForDef.type;
export const RequestForSchema = RequetsForDef.schema;
export const RequestForOptions = RequestForSchema.options;

export const CataLogRequetsForDef = makeZodEnum([
  "Influencer",
  "Retailer",
  "Distributor",
  "Dealer",
  "Scouting",
  "Owner",
  "BAT",
  "RDC",
] as const);
export type CatalogRequestForType = typeof CataLogRequetsForDef.type;
export const CatalogRequestForSchema = CataLogRequetsForDef.schema;
export const CatalogRequestForOptions = CatalogRequestForSchema.options;


export const BranchIsLiibraryDef = makeZodEnum(["Yes", "No"] as const);
export type BranchIsLiibrary = typeof BranchIsLiibraryDef.type;
export const BranchIsLiibrarySchema = BranchIsLiibraryDef.schema;
export const BranchIsLiibraryOptions = BranchIsLiibrarySchema.options;

export const RequestTypeDef = makeZodEnum([
  "sample_request", "catalog_request"
] as const);
export type RequestType = typeof RequestTypeDef.type;
export const RequestTypeSchema = RequestTypeDef.schema;
export const RequestTypeOptions = RequestTypeSchema.options;