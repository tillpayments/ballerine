import type { JsonValue } from 'type-fest';
import { Customer, PrismaClient, Project, User, UserToProject } from '@prisma/client';
import * as runtime from '@prisma/client/runtime/library';

export type InputJsonValue = Omit<JsonValue, 'null'>;
export type NullableJsonNullValueInput = {
  set: null;
};

export interface IObjectWithId {
  id: string;
}

export type Unpacked<T> = T extends Array<infer U> ? U : T;

export type TProjectIds = string[] | null;
export type TProjectId = string;

export type TExpires = { expires: Date };
export type UserWithProjects = User & {
  userToProjects?: Omit<UserToProject[], 'userId'>;
};
export type CustomerWithProjectIds = Customer & { projectIds: TProjectIds };
export type CustomerWithProjects = Partial<Customer & { projects: Project[] }>;
export type AuthenticatedEntity = {
  user?: Partial<User>;
  customer?: Partial<Customer>;
  type: 'user' | 'customer' | 'admin';
};
export type AuthenticatedEntityWithProjects = AuthenticatedEntity & { projectIds: TProjectIds };

export type ObjectValues<TObject extends Record<PropertyKey, any>> = TObject[keyof TObject];

export type AnyArray = any[];

export type AnyRecord = Record<PropertyKey, any>;

export type GenericFunction = (...args: AnyArray) => any;

export type GenericAsyncFunction = (...args: AnyArray) => Promise<any>;

export type PrismaTransaction = Omit<PrismaClient, runtime.ITXClientDenyList>;

export type PrismaTransactionMethod = Parameters<PrismaClient['$transaction']>[0];

export type PrismaTransactionClient = Parameters<PrismaTransactionMethod>[0];
