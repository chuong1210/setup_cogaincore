# Tier 2: Nhóm (Groups) — TreeTable & TreeSelect Pattern

Tier 2 entities represent hierarchical categorizations (e.g., `DeliveryVehicleGroup`, `TradeDocumentGroup`, `AssetGroup`, `ProductGroup`). They feature self-referencing parent-child relationships (`parentId`, `children`).

> [!IMPORTANT]
> **Strict Architecture Rule**:
> - Any entity or table with a hierarchy (`parentId`, `children`) **MUST use `TreeTable`** (`@shared/components/custom/tree-table`) on the listing page.
> - The parent selection in the form **MUST use `TreeSelect`** (`@shared/components/custom/tree-select`) with cycle prevention via `buildTreeSelect(data, currentId)`.

---

## 1. Architectural Characteristics

| Dimension | Standard Specification |
| :--- | :--- |
| **Listing Table** | **`TreeTable`** from `@shared/components/custom/tree-table` |
| **Tree Structuring** | `buildTreeData(allQuery.data?.data)` from `@shared/lib/tree-utils` |
| **Client-side Filtering** | `deepFilterTree(treeData, filters)` (preserves parent branches when child matches) |
| **Parent Selector** | **`TreeSelect`** from `@shared/components/custom/tree-select` with `buildTreeSelect(list, excludeId)` |
| **Form Presentation** | **Modal `Dialog`** (if ≤ 5–6 fields: name, code, typeId, parentId, status) or **Slideout `Sheet`** if rich specs are present |
| **Type Selector** | `Combobox` or `CustomSelect` with options from Tier 1 (Type) dropdown query |
| **Bulk Actions** | `bulkSelectionActions` on `TreeTable` using `PopConfirm` and `deleteItemsMutation` |

---

## 2. Tree Utility Architecture (`tree-utils.ts`)

`@shared/lib/tree-utils` provides standard algorithms to build nested trees:

```typescript
import { buildTreeData, buildTreeSelect } from '@shared/lib/tree-utils';

// 1. In Page: Convert flat list from API into nested tree for TreeTable
const treeData = useMemo(() => buildTreeData(allQuery.data?.data || []), [allQuery.data?.data]);

// 2. In Form: Convert flat list into options for TreeSelect (excluding current id to prevent circular nesting)
const treeOptions = useMemo(
  () => buildTreeSelect(allGroupsQuery.data?.data, currentEntityId) || [],
  [allGroupsQuery.data?.data, currentEntityId]
);
```

### Deep Recursive Filtering (`deepFilterTree`)
For hierarchical tables, standard flat filtering breaks tree parents. Use `deepFilterTree`:
```typescript
function deepFilterTree<T extends { children?: T[]; [key: string]: any }>(
  data: T[],
  filters: Record<string, any>,
): T[] {
  const matchText = (val: string, kw?: string) =>
    kw ? val?.toLowerCase().includes(kw.toLowerCase()) : true;

  return data
    .map((node) => {
      const matchName = filters.name ? matchText(node.name, filters.name) : true;
      const matchCode = filters.code ? matchText(node.code, filters.code) : true;
      const matchStatus = filters.status ? String(node.status) === filters.status : true;
      const matchType = filters.typeId ? String(node.typeId) === filters.typeId : true;

      const matchSelf = matchName && matchCode && matchStatus && matchType;
      const filteredChildren = node.children ? deepFilterTree(node.children, filters) : [];

      if (matchSelf || filteredChildren.length > 0) {
        if (matchSelf) return { ...node };
        return { ...node, children: filteredChildren };
      }
      return null;
    })
    .filter(Boolean) as T[];
}
```

---

## 3. Standard Group Form (`*-group-form.tsx`)

Reference implementations:
- [delivery-vehicle-group-form.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/shared/components/master-data/delivery-vehicles/delivery-vehicle-group-form.tsx)
- [trade-document-group-form.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/shared/components/master-data/trade-documents/trade-document-group-form.tsx)

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TFunction } from 'i18next';
import { Save } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Switch,
  Combobox,
} from '@shared/ui';
import { Input } from '@shared/ui/input';
import TreeSelect from '@shared/components/custom/tree-select';
import { buildTreeSelect } from '@shared/lib/tree-utils';
import { useFormPermissions } from '@shared/permission';
import { useMyEntityGroup } from '@shared/hooks/master-data/use-my-entity-group';
import { useMyEntityType } from '@shared/hooks/master-data/use-my-entity-type';
import { MasterDataStatus } from '@shared/enums';

const createSchema = (t: TFunction) =>
  z.object({
    name: z
      .string()
      .min(
        1,
        t('myEntityGroup:validation.nameRequired', {
          defaultValue: 'Tên không được để trống',
        }),
      )
      .trim(),
    code: z.string().optional(),
    status: z.boolean().optional(),
    myEntityTypeId: z.string().min(
      1,
      t('myEntityGroup:validation.typeRequired', {
        defaultValue: 'Loại không được để trống',
      }),
    ),
    parentId: z.string().optional(),
  });

type FormValues = z.infer<ReturnType<typeof createSchema>>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id?: string;
  mode: 'create' | 'edit';
  permissionModule?: string;
};

export function MyEntityGroupForm({
  id,
  mode,
  open,
  onOpenChange,
  permissionModule,
}: Props) {
  const { t } = useTranslation(['message', 'myEntityGroup', 'action', 'common']);
  const { canSave, isReadOnly } = useFormPermissions(permissionModule ?? '', mode);

  // Group Query & Mutations
  const {
    getByIdQuery,
    createMutation,
    updateMutation,
    allQuery: allGroupsQuery,
  } = useMyEntityGroup({
    id: mode === 'edit' ? id : undefined,
    queryParam: {
      getById: { isEnable: open && mode === 'edit' },
      all: { isEnable: open },
    },
  });

  // Type Dropdown Query for foreign key selection
  const { dropdownQuery: typeDropdownQuery } = useMyEntityType({
    queryParam: {
      dropdown: { isEnable: open },
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(createSchema(t)),
    defaultValues: {
      name: '',
      code: '',
      status: true,
      myEntityTypeId: '',
      parentId: '',
    },
  });

  useEffect(() => {
    if (open && mode === 'edit' && getByIdQuery.data) {
      form.reset({
        name: getByIdQuery.data.data?.name ?? '',
        code: getByIdQuery.data.data?.code ?? '',
        status: getByIdQuery.data.data?.status !== MasterDataStatus.Inactive,
        myEntityTypeId: getByIdQuery.data.data?.myEntityTypeId ?? '',
        parentId: getByIdQuery.data.data?.parentId ?? '',
      });
    } else if (open && mode === 'create') {
      form.reset({
        name: '',
        code: '',
        status: true,
        myEntityTypeId: '',
        parentId: '',
      });
    }
  }, [open, mode, getByIdQuery.data, form]);

  const handleSubmit = async (values: FormValues) => {
    if (!canSave) return;

    let status: number | undefined;
    if (mode !== 'create') {
      status = values.status ? MasterDataStatus.Active : MasterDataStatus.Inactive;
    }

    const payload = {
      ...values,
      status,
      parentId: values.parentId ? values.parentId : null,
      children: null,
    };

    if (mode === 'create') {
      await createMutation.mutateAsync({
        ...payload,
        status: MasterDataStatus.Active,
      });
      form.reset({
        name: '',
        code: '',
        status: true,
        myEntityTypeId: '',
        parentId: '',
      });
      return;
    }

    if (!id) return;

    await updateMutation.mutateAsync({ id, data: payload });
    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
  };

  if (mode === 'edit' && getByIdQuery.isFetching) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl! w-full p-0 border-0" showCloseButton={false}>
          <div className="px-5 py-4 min-h-[200px] flex items-center justify-center">
            <div className="text-muted-foreground">{t('message:loading')}</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl! w-full p-0 border-0" showCloseButton={false}>
        <DialogHeader className="bg-primary text-primary-foreground px-5 py-3 rounded-t-lg">
          <DialogTitle className="text-primary-foreground">
            {mode === 'create'
              ? t('action:add', { defaultValue: 'Thêm' })
              : t('action:edit', { defaultValue: 'Chỉnh sửa' })}{' '}
            {t('myEntityGroup:title', { defaultValue: 'Nhóm danh mục' })}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {mode === 'edit' && (
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('myEntityGroup:columnTitle.code', { defaultValue: 'Mã' })}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} disabled className="font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('myEntityGroup:columnTitle.name', { defaultValue: 'Tên nhóm' })} *
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isReadOnly}
                        placeholder={t('myEntityGroup:placeholder.name', {
                          defaultValue: 'Nhập tên nhóm...',
                        })}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Foreign key to Type */}
              <FormField
                control={form.control}
                name="myEntityTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('myEntityGroup:columnTitle.type', {
                        defaultValue: 'Loại danh mục',
                      })}{' '}
                      *
                    </FormLabel>
                    <FormControl>
                      <Combobox
                        options={
                          typeDropdownQuery.data?.data?.map((item: any) => ({
                            label: item.name,
                            value: item.id,
                          })) ?? []
                        }
                        {...field}
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isReadOnly || typeDropdownQuery.isLoading}
                        placeholder={t('myEntityGroup:placeholder.selectType', {
                          defaultValue: 'Chọn loại danh mục',
                        })}
                        error={typeDropdownQuery.error}
                        onRetry={() => typeDropdownQuery.refetch()}
                        loading={typeDropdownQuery.isFetching}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hierarchical Parent Selector via TreeSelect */}
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('myEntityGroup:columnTitle.parent', { defaultValue: 'Nhóm cha' })}
                    </FormLabel>
                    <FormControl>
                      <TreeSelect
                        className="w-full"
                        loading={allGroupsQuery.isFetching}
                        options={buildTreeSelect(allGroupsQuery.data?.data, id) || []}
                        error={allGroupsQuery.error}
                        onRetry={() => allGroupsQuery.refetch()}
                        value={field.value ? [field.value] : []}
                        onValueChange={(value) => field.onChange(value[0])}
                        disabled={isReadOnly}
                        placeholder={t('myEntityGroup:placeholder.selectParent', {
                          defaultValue: 'Chọn nhóm cha (tùy chọn)',
                        })}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {mode === 'edit' && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs">
                      <div className="space-y-0.5">
                        <FormLabel>
                          {t('myEntityGroup:columnTitle.status', {
                            defaultValue: 'Trạng thái',
                          })}
                        </FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isReadOnly}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleClose}>
                  {t('action:cancel', { defaultValue: 'Hủy' })}
                </Button>
                {canSave && (
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {t('action:save', { defaultValue: 'Lưu' })}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 4. Standard Group Page with TreeTable (`*-group-page.tsx`)

Reference implementation:
- [delivery-vehicle-group-page.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/shared/components/master-data/delivery-vehicles/delivery-vehicle-group-page.tsx)
- [trade-document-group-page.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/shared/components/master-data/trade-documents/trade-document-group-page.tsx)

```tsx
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { format, parse } from 'date-fns';
import { Edit, Plus, Trash2 } from 'lucide-react';
import StatusTag from '@shared/components/common/status-tag';
import { Container } from '@shared/components/container';
import { ActionStack } from '@shared/components/custom/action-stack';
import { CustomSelect } from '@shared/components/custom/custom-select';
import DateRangeInput from '@shared/components/custom/date-range-input';
import DebouncedInput from '@shared/components/custom/debounce-input';
import { TreeTable } from '@shared/components/custom/tree-table';
import { buildTreeData } from '@shared/lib/tree-utils';
import {
  ExportButton,
  ImportButton,
  PopConfirm,
  ModifierInfo,
} from '@shared/components';
import { Button, Checkbox } from '@shared/ui';
import { useHasPermission } from '@shared/permission';
import { useTableChange } from '@shared/hooks/use-table-change';
import { useFile } from '@shared/hooks/use-file';
import { useGenerationCode } from '@shared/hooks/use-generation-code';
import { useMyEntityGroup } from '@shared/hooks/master-data/use-my-entity-group';
import { useMyEntityType } from '@shared/hooks/master-data/use-my-entity-type';
import { MyEntityGroupForm } from './my-entity-group-form';
import { EUploadType } from '@shared/enums/upload-type.enum';
import { MasterDataStatus } from '@shared/enums';
import type {
  IMyEntityGroup,
  IMyEntityGroupParams,
} from '@shared/types/master-data/my-entity-group.type';

// ── Recursive Filter Helper ──────────────────────────────────────────────────
function deepFilterTree(
  data: IMyEntityGroup[],
  filters: IMyEntityGroupParams,
): IMyEntityGroup[] {
  const matchText = (value: string, keyword?: string) =>
    keyword ? value?.toLowerCase().includes(keyword.toLowerCase()) : true;

  return data
    .map((node) => {
      const matchName = filters.name ? matchText(node.name, filters.name) : true;
      const matchCode = filters.code ? matchText(node.code, filters.code) : true;
      const matchStatus = filters.status ? String(node.status) === filters.status : true;
      const matchType = filters.myEntityTypeId
        ? String(node.myEntityTypeId) === filters.myEntityTypeId
        : true;

      const modified = node.lastModifiedDate ? new Date(node.lastModifiedDate) : null;
      const matchFrom = filters.fromDate
        ? modified ? modified >= new Date(filters.fromDate) : false
        : true;
      const matchTo = filters.toDate
        ? modified ? modified <= new Date(filters.toDate) : false
        : true;

      const matchSelf = matchName && matchCode && matchStatus && matchType && matchFrom && matchTo;
      const filteredChildren = node.children ? deepFilterTree(node.children, filters) : [];

      if (matchSelf || filteredChildren.length > 0) {
        if (matchSelf) return { ...node };
        return { ...node, children: filteredChildren };
      }

      return null;
    })
    .filter(Boolean) as IMyEntityGroup[];
}

export function MyEntityGroupPage({
  queryParams,
  fullPath,
  permissionModule,
  permissions,
  CodeGenerationRuleForm,
}: any) {
  const { t } = useTranslation(['common', 'action', 'message', 'myEntityGroup']);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedId, setSelectedId] = useState<string>('');
  const { downloadFile } = useFile();

  const canCreate = useHasPermission(permissionModule, permissions.Create);
  const canUpdate = useHasPermission(permissionModule, permissions.Update);
  const canDelete = useHasPermission(permissionModule, permissions.Delete);
  const canExport = useHasPermission(permissionModule, permissions.Export);
  const canImport = useHasPermission(permissionModule, permissions.Import);

  const {
    allQuery,
    deleteItemsMutation,
    exportDataMutation,
    checkGenerationCodeQuery,
  } = useMyEntityGroup({
    queryParam: {
      all: {
        isEnable: true,
        includes: ['MyEntityType', 'Parent'],
      },
      checkGenerationCode: { isEnable: true },
    },
  });

  const { dropdownQuery: typeDropdownQuery } = useMyEntityType({
    queryParam: { dropdown: { isEnable: true } },
  });

  const typeOptions = (typeDropdownQuery.data?.data ?? []).map((x: any) => ({
    label: x.name,
    value: x.id,
  }));

  const { updateFilters, handleSortingChange, handlePaginationChange, sorting, filtering } =
    useTableChange<IMyEntityGroupParams>({
      fullPath,
      searchData: queryParams,
      filterKeys: ['name', 'code', 'status', 'myEntityTypeId'],
    });

  const { handleCheckAndProceed, isChecking, GenerationCodeDialogs } = useGenerationCode({
    checkGenerationCodeQuery,
    onProceed: () => {
      setSelectedId('');
      setFormMode('create');
      setIsFormOpen(true);
    },
    CodeGenerationRuleForm,
  });

  // 1. Build nested tree structure
  const treeData = useMemo(() => {
    return buildTreeData(allQuery.data?.data || []);
  }, [allQuery.data?.data]);

  // 2. Filter tree structure keeping parent branches
  const filteredTree = useMemo(() => {
    if (
      !queryParams.name &&
      !queryParams.code &&
      !queryParams.status &&
      !queryParams.myEntityTypeId &&
      !queryParams.fromDate &&
      !queryParams.toDate
    ) {
      return treeData;
    }
    return deepFilterTree(treeData, queryParams);
  }, [queryParams, treeData]);

  const handleEdit = (id: string) => {
    setSelectedId(id);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const handleBulkDelete = async (selectedRows: IMyEntityGroup[]) => {
    const ids = selectedRows.map((row) => row.id);
    await deleteItemsMutation.mutateAsync(ids);
  };

  const columns: ColumnDef<IMyEntityGroup>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value: any) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value: any) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'code',
      header: t('myEntityGroup:columnTitle.code', { defaultValue: 'Mã nhóm' }),
      cell: ({ row }) => <span className="font-mono">{row.getValue('code')}</span>,
      enableColumnFilter: true,
      meta: {
        width: 160,
        filterElement: (
          <DebouncedInput
            className="shadow-none"
            size="sm"
            value={queryParams.code ?? ''}
            onChange={(value: any) => updateFilters({ code: value ? value : undefined })}
          />
        ),
      },
    },
    {
      accessorKey: 'name',
      header: t('myEntityGroup:columnTitle.name', { defaultValue: 'Tên nhóm' }),
      cell: ({ row }) => row.getValue('name'),
      enableColumnFilter: true,
      meta: {
        width: 250,
        filterElement: (
          <DebouncedInput
            className="shadow-none"
            size="sm"
            value={queryParams.name ?? ''}
            onChange={(value: any) => updateFilters({ name: value ? value : undefined })}
          />
        ),
      },
    },
    {
      accessorKey: 'myEntityType.name',
      header: t('myEntityGroup:columnTitle.type', { defaultValue: 'Loại' }),
      cell: ({ row }) => (row.original as any).myEntityType?.name || '',
      enableColumnFilter: true,
      meta: {
        width: 200,
        filterElement: (
          <CustomSelect
            className="shadow-none w-full"
            options={typeOptions}
            value={queryParams.myEntityTypeId ?? undefined}
            onChangeValue={(value: any) =>
              updateFilters({ myEntityTypeId: value ? String(value) : undefined })
            }
          />
        ),
      },
    },
    {
      accessorKey: 'status',
      header: t('myEntityGroup:columnTitle.status', { defaultValue: 'Trạng thái' }),
      cell: ({ row }) => <StatusTag status={row.getValue('status')} />,
      enableColumnFilter: true,
      meta: {
        width: 140,
        filterElement: (
          <CustomSelect
            className="shadow-none w-full"
            options={[
              { label: t('common:isActive.active', { defaultValue: 'Hoạt động' }), value: String(MasterDataStatus.Active) },
              { label: t('common:isActive.inactive', { defaultValue: 'Không hoạt động' }), value: String(MasterDataStatus.Inactive) },
            ]}
            value={queryParams.status ?? undefined}
            onChangeValue={(value: any) =>
              updateFilters({ status: value ? String(value) : undefined })
            }
          />
        ),
      },
    },
    {
      accessorKey: 'modified',
      header: t('common:modified', { defaultValue: 'Chỉnh sửa' }),
      cell: ({ row }) => (
        <ModifierInfo
          createdDate={row.original.createdDate}
          lastModifiedDate={row.original.lastModifiedDate}
          createdByUser={row.original.createdByUser}
          modifiedByUser={row.original.modifiedByUser}
        />
      ),
      enableColumnFilter: true,
      meta: {
        width: 160,
        filterElement: (
          <DateRangeInput
            inputProps={{ size: 'sm', className: 'shadow-none' }}
            onChange={(range: any) => {
              updateFilters({
                fromDate: range?.from ? format(range.from, 'yyyy-MM-dd') : undefined,
                toDate: range?.to ? format(range.to, 'yyyy-MM-dd') : undefined,
              });
            }}
            value={
              !!queryParams.fromDate && !!queryParams.toDate
                ? {
                    from: parse(queryParams.fromDate, 'yyyy-MM-dd', new Date()),
                    to: parse(queryParams.toDate, 'yyyy-MM-dd', new Date()),
                  }
                : undefined
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
        </div>
      ),
    },
  ];

  return (
    <Container>
      <TreeTable
        columns={columns}
        data={filteredTree}
        loading={allQuery.isFetching}
        manualSorting
        manualFiltering
        manualPagination
        expandAll
        enableRowSelection
        enableColumnVisibility
        enableVirtualization={true}
        enablePagination={false}
        sorting={sorting}
        filtering={filtering}
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
        titleProps={{
          title: t('myEntityGroup:title', { defaultValue: 'Nhóm danh mục' }),
          actions: (
            <ActionStack
              actions={[
                {
                  key: 'add',
                  label: t('action:add', { defaultValue: 'Thêm' }),
                  icon: <Plus className="h-4 w-4" />,
                  onClick: handleCheckAndProceed,
                  disabled: isChecking,
                  hidden: !canCreate,
                },
                {
                  key: 'export',
                  hidden: !canExport,
                  element: (
                    <ExportButton
                      onClick={async () => {
                        const filePath = await exportDataMutation.mutateAsync(queryParams);
                        if (filePath) {
                          await downloadFile({
                            filePath,
                            uploadType: EUploadType.Sftp,
                            downloadFileName: `DataExport_${t('myEntityGroup:title', { defaultValue: 'Nhom' })}.xlsx`,
                          });
                        }
                      }}
                      loading={exportDataMutation.isPending}
                    />
                  ),
                },
              ]}
            />
          ),
        }}
        bulkSelectionActions={(table) => {
          const selectedRows = table
            .getFilteredSelectedRowModel()
            .flatRows.map((row: Row<IMyEntityGroup>) => row.original);
          return (
            canDelete && (
              <PopConfirm
                variant="destructive"
                onConfirm={async () => {
                  await handleBulkDelete(selectedRows);
                  table.resetRowSelection();
                }}
              >
                {(onClick: any) => (
                  <Button variant="outline" size="sm" onClick={onClick} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('action:delete', { defaultValue: 'Xóa' })}
                  </Button>
                )}
              </PopConfirm>
            )
          );
        }}
      />

      <MyEntityGroupForm
        id={selectedId}
        mode={formMode}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        permissionModule={permissionModule}
      />

      <GenerationCodeDialogs />
    </Container>
  );
}
```
