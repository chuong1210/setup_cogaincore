Template for TanStack Query hook and service integration (e.g., `src/routes/_app/.../_hooks/use-[my-entity].tsx`):

```typescript
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createBaseService } from '@shared/services/base-service';
import { getApi } from '@/lib/api-client';
import { buildApiParams } from '@shared/lib';
import { toastSuccess } from '@shared/lib/toast';
import type { IBaseAPIParams, IPagedAPIParams, QueryParam } from '@shared/types';
import type { IMyEntity, IMyEntityParams, IMyEntityRequest } from '@/types/...';

const myEntityService = createBaseService<IMyEntity, IMyEntityRequest>({
  api: getApi,
  controller: '/api/v1/MyEntities', // Update with target microservice Base Route
});

type UseMyEntityProps = {
  id?: string;
  queryParam?: Partial<
    Record<
      'paging' | 'getById' | 'dropdown' | 'all' | 'checkGenerationCode' | 'getTemplateImport',
      QueryParam<IMyEntityParams>
    >
  >;
};

const DEFAULT_STALE_TIME = 5 * 60 * 1000;
const queryKey = 'my-entity';

export function useMyEntity({ id, queryParam }: UseMyEntityProps = {}) {
  const { t } = useTranslation('message');
  const queryClient = useQueryClient();

  const apiParams = useCallback((hookParam?: QueryParam<IMyEntityParams>) => {
    if (hookParam) {
      return buildApiParams({
        queryObj: hookParam.params as IMyEntityParams,
        listKeysFilter: hookParam.filterKeys,
        listKeysSearch: hookParam.searchKeys,
        includes: hookParam.includes,
        compares: hookParam.compares,
      });
    }
    return {};
  }, []);

  const handleInvalid = () => {
    queryClient.invalidateQueries({ queryKey: [`${queryKey}s`] });
    queryClient.invalidateQueries({ queryKey: [`${queryKey}-all`] });
    queryClient.invalidateQueries({ queryKey: [`${queryKey}-dropdown`] });
  };

  const pagingQuery = useQuery({
    queryKey: [`${queryKey}s`, JSON.stringify(queryParam?.paging?.params)],
    queryFn: async () => {
      const params = apiParams(queryParam?.paging);
      return await myEntityService.getPaged({
        ...params,
        page: queryParam?.paging?.params?.page,
        pageSize: queryParam?.paging?.params?.pageSize,
      } as IPagedAPIParams);
    },
    staleTime: DEFAULT_STALE_TIME,
    placeholderData: (previousData) => previousData,
    enabled: !!queryParam?.paging?.isEnable,
  });

  const getByIdQuery = useQuery({
    queryKey: [queryKey, id],
    queryFn: async () => {
      return await myEntityService.getById({ id: id! });
    },
    staleTime: DEFAULT_STALE_TIME,
    enabled: !!id && !!queryParam?.getById?.isEnable,
  });

  const checkGenerationCodeQuery = useQuery({
    queryKey: [`${queryKey}-check-gen-code`],
    queryFn: async () => await myEntityService.checkExistGenerationCode(),
    staleTime: DEFAULT_STALE_TIME,
    enabled: !!queryParam?.checkGenerationCode?.isEnable,
  });

  const getTemplateImport = useQuery({
    queryKey: [`${queryKey}-template-import`],
    queryFn: async () => await myEntityService.exportTemplate(),
    staleTime: DEFAULT_STALE_TIME,
    enabled: !!queryParam?.getTemplateImport?.isEnable,
  });

  const createMutation = useMutation({
    mutationFn: async (data: IMyEntityRequest) => await myEntityService.create(data),
    onSuccess: () => {
      toastSuccess(t('message:success'));
      handleInvalid();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: IMyEntityRequest }) =>
      await myEntityService.update(id, data),
    onSuccess: (_, variables) => {
      toastSuccess(t('message:success'));
      queryClient.invalidateQueries({ queryKey: [queryKey, variables.id] });
      handleInvalid();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await myEntityService.delete(id),
    onSuccess: () => {
      toastSuccess(t('message:success'));
      handleInvalid();
    },
  });

  const deleteItemsMutation = useMutation({
    mutationFn: async (ids: string[]) => await myEntityService.deleteItems(ids),
    onSuccess: () => {
      toastSuccess(t('message:success'));
      handleInvalid();
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: async (params: Record<string, string | undefined>) =>
      await myEntityService.exportData(params),
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => await myEntityService.import(file),
    onSuccess: () => {
      toastSuccess(t('message:success'));
      handleInvalid();
    },
  });

  return {
    pagingQuery,
    getByIdQuery,
    checkGenerationCodeQuery,
    getTemplateImport,
    createMutation,
    updateMutation,
    deleteMutation,
    deleteItemsMutation,
    exportDataMutation,
    importMutation,
  };
}
```
