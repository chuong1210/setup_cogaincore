Template for Main List Page & Table (e.g., `src/routes/_app/.../index.tsx`):

```typescript

import React, { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import z from 'zod';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { format, parse } from 'date-fns';
import { Edit, Plus, Trash2 } from 'lucide-react';

import { Button, Checkbox } from '@shared/ui';
import { useHasPermission } from '@shared/permission';
import { useTableChange } from '@shared/hooks/use-table-change';
import { useFile } from '@shared/hooks/use-file';
import { useGenerationCode } from '@shared/hooks/use-generation-code';
import { EUploadType, MasterDataStatus } from '@shared/enums';
import { toastError } from '@shared/lib/toast';
import {
  CustomTable,
  ExportButton,
  ImportButton,
  PopConfirm,
  DeleteConfirm,
  ModifierInfo,
  ImportDialog,
  Container,
  ActionStack,
  CustomSelect,
  DateRangeInput,
  DebouncedInput,
  StatusTag,
} from '@shared/components';

import { useMyEntity } from './_hooks/use-my-entity';
import { MyEntityForm } from './_components/my-entity-form';
import type { IMyEntity, IMyEntityParams } from '@/types/...';

const PostSearchSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  status: z.string().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

export const Route = createFileRoute('/_app/[module-group]/[my-entity]/')({
  validateSearch: zodValidator(PostSearchSchema),
  component: MyEntityRoute,
});

function MyEntityRoute() {
  const queryParams = Route.useSearch() as IMyEntityParams;
  const fullPath = Route.fullPath;
  const permissionModule = 'MyEntityPermissionKey'; // Đổi sang PermissionModuleEn của module

  const { t } = useTranslation(['myEntity', 'common', 'action', 'message']);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedId, setSelectedId] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const { downloadFile } = useFile();

  // Khai báo permissions tương ứng
  const canCreate = useHasPermission(permissionModule, 'Create');
  const canUpdate = useHasPermission(permissionModule, 'Update');
  const canDelete = useHasPermission(permissionModule, 'Delete');
  const canExport = useHasPermission(permissionModule, 'Export');
  const canImport = useHasPermission(permissionModule, 'Import');

  const {
    pagingQuery,
    deleteMutation,
    deleteItemsMutation,
    exportDataMutation,
    checkGenerationCodeQuery,
    importMutation,
    getTemplateImport,
  } = useMyEntity({
    queryParam: {
      paging: {
        isEnable: true,
        params: queryParams,
        searchKeys: ['name', 'code'],
        compares: [
          {
            key: 'lastModifiedDate',
            listKeysCompare: [
              { key: 'fromDate', operator: '>=' },
              { key: 'toDate', operator: '<=' },
            ],
          },
        ],
        filterKeys: ['status'],
      },
      checkGenerationCode: { isEnable: true },
      getTemplateImport: { isEnable: true },
    },
  });

  const { updateFilters, handleSortingChange, handlePaginationChange, sorting, filtering } =
    useTableChange<IMyEntityParams>({
      fullPath,
      searchData: queryParams,
      filterKeys: ['name', 'code'],
    });

  const { handleCheckAndProceed, isChecking, GenerationCodeDialogs } = useGenerationCode({
    checkGenerationCodeQuery,
    onProceed: () => {
      setSelectedId('');
      setFormMode('create');
      setIsFormOpen(true);
    },
  });

  const handleEdit = (id: string) => {
    setSelectedId(id);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const handleBulkDelete = async (selectedRows: IMyEntity[]) => {
    const ids = selectedRows.map((row) => row.id);
    await deleteItemsMutation.mutateAsync(ids);
  };

  const handleExportData = async () => {
    if (!canExport) return;
    try {
      const exportParams: Record<string, string | undefined> = {
        name: queryParams.name,
        code: queryParams.code,
        status: queryParams.status,
        fromDate: queryParams.fromDate,
        toDate: queryParams.toDate,
      };
      Object.keys(exportParams).forEach((key) => {
        if (!exportParams[key]) delete exportParams[key];
      });

      const filePath = await exportDataMutation.mutateAsync(exportParams);
      if (filePath) {
        await downloadFile({
          filePath,
          uploadType: EUploadType.Sftp,
          downloadFileName: `DataExport_${t('myEntity:title')}.xlsx`,
        });
      }
    } catch (error) {
      toastError(error instanceof Error ? error.message : t('message:error'));
    }
  };

  const columns: ColumnDef<IMyEntity>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'code',
      header: t('myEntity:columnTitle.code'),
      cell: ({ row }) => row.getValue('code'),
      meta: {
        filterElement: () => (
          <DebouncedInput
            size="sm"
            value={queryParams.code ?? ''}
            onChange={(val) => updateFilters({ code: val || undefined })}
          />
        ),
      },
    },
    {
      accessorKey: 'name',
      header: t('myEntity:columnTitle.name'),
      cell: ({ row }) => row.getValue('name'),
      meta: {
        filterElement: () => (
          <DebouncedInput
            size="sm"
            value={queryParams.name ?? ''}
            onChange={(val) => updateFilters({ name: val || undefined })}
          />
        ),
      },
    },
    {
      accessorKey: 'status',
      header: t('myEntity:columnTitle.status'),
      cell: ({ row }) => <StatusTag status={row.getValue('status')} />,
      meta: {
        filterElement: () => (
          <CustomSelect
            options={[
              { label: t('common:isActive.active'), value: String(MasterDataStatus.Active) },
              { label: t('common:isActive.inactive'), value: String(MasterDataStatus.Inactive) },
            ]}
            value={queryParams.status}
            onChangeValue={(val) => updateFilters({ status: val ? String(val) : undefined })}
          />
        ),
      },
    },
    {
      accessorKey: 'modified',
      header: t('common:modified'),
      cell: ({ row }) => (
        <ModifierInfo
          createdDate={row.original.createdDate}
          lastModifiedDate={row.original.lastModifiedDate}
          createdByUser={row.original.createdByUser}
          modifiedByUser={row.original.modifiedByUser}
        />
      ),
      meta: {
        filterElement: (
          <DateRangeInput
            inputProps={{ size: 'sm' }}
            value={
              queryParams.fromDate && queryParams.toDate
                ? {
                    from: parse(queryParams.fromDate, 'yyyy-MM-dd', new Date()),
                    to: parse(queryParams.toDate, 'yyyy-MM-dd', new Date()),
                  }
                : undefined
            }
            onChange={(range) =>
              updateFilters({
                fromDate: range.from ? format(range.from, 'yyyy-MM-dd') : undefined,
                toDate: range.to ? format(range.to, 'yyyy-MM-dd') : undefined,
              })
            }
          />
        ),
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          {canUpdate && (
            <Button variant="outline" size="sm" onClick={() => handleEdit(row.original.id)}>
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" size="sm" onClick={() => setDeleteId(row.original.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Container>
      <CustomTable
        tableId="my-entity-table"
        columns={columns}
        data={pagingQuery.data?.data || []}
        loading={pagingQuery.isFetching}
        manualSorting
        manualFiltering
        manualPagination
        enableRowSelection
        enableColumnVisibility
        pageCount={pagingQuery.data?.totalPages}
        pagination={{
          pageIndex: (queryParams.page ?? 1) - 1,
          pageSize: queryParams.pageSize ?? 10,
        }}
        sorting={sorting}
        filtering={filtering}
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
        titleProps={{
          title: t('myEntity:title'),
          actions: (
            <ActionStack
              actions={[
                {
                  key: 'add',
                  label: t('action:add'),
                  icon: <Plus className="h-4 w-4" />,
                  onClick: handleCheckAndProceed,
                  disabled: isChecking,
                  hidden: !canCreate,
                },
                {
                  key: 'import',
                  hidden: !canImport,
                  element: <ImportButton onClick={() => setIsImportOpen(true)} />,
                },
                {
                  key: 'export',
                  hidden: !canExport,
                  element: (
                    <ExportButton
                      onClick={handleExportData}
                      loading={exportDataMutation.isPending}
                    />
                  ),
                },
              ]}
            />
          ),
        }}
        bulkSelectionActions={(table) => {
          const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
          return (
            canDelete && (
              <PopConfirm
                variant="destructive"
                onConfirm={async () => {
                  await handleBulkDelete(selectedRows);
                  table.resetRowSelection();
                }}
                children={(onClick) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClick}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('action:delete')}
                  </Button>
                )}
              />
            )
          );
        }}
      />

      {isFormOpen && (
        <MyEntityForm
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          mode={formMode}
          id={selectedId}
          permissionModule={permissionModule}
        />
      )}

      {isImportOpen && (
        <ImportDialog
          open={isImportOpen}
          onOpenChange={setIsImportOpen}
          title={t('myEntity:import.title')}
          description={t('myEntity:import.description')}
          onImport={(file) => importMutation.mutateAsync(file)}
          isImporting={importMutation.isPending}
          templateQuery={{
            data: getTemplateImport.data,
            isFetching: getTemplateImport.isFetching,
          }}
        />
      )}

      {!!deleteId && (
        <DeleteConfirm
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          onConfirm={async () => {
            if (deleteId) {
              await deleteMutation.mutateAsync(deleteId);
              setDeleteId(null);
            }
          }}
          loading={deleteMutation.isPending}
        />
      )}

      {GenerationCodeDialogs}
    </Container>
  );
}

```
