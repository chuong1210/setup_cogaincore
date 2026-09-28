Template for TypeScript type definitions (e.g., `src/types/.../[my-entity].type.ts`):

```typescript
import type { IBaseParams } from '@shared/types';

export interface IMyEntity {
  id: string;
  code: string;
  name: string;
  status: number;
  createdDate: string;
  lastModifiedDate: string;
  createdByUser?: { id: string; userName: string; fullName: string };
  modifiedByUser?: { id: string; userName: string; fullName: string };
}

export interface IMyEntityParams extends IBaseParams {
  name?: string;
  code?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface IMyEntityRequest {
  code: string;
  name: string;
  status?: number;
}
```
