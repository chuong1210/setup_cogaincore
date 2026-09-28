# Tier 3: Danh mục (Catalogs / Main Entities) — Slideout Sheet Pattern

Tier 3 master data entities represent central business catalogs (e.g., `TradeDocument`, `DeliveryVehicle`, `FinishedGood`, `Material`, `Customer`, `Vendor`). These entities have high field density, multiple relational links (Type, Group), embedded specifications, or child requirement grids.

---

## 1. Architectural Decision Matrix: Dialog vs. Slideout Sheet

The presentation mode of the form is determined strictly by field density and child relations:

```
                            [Form Presentation Decision]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
         Few Fields (< 6–8)                             Many Fields (≥ 6–8)
      No Child Tables / No Tabs                      Sub-grids / Fieldset Groups
                 │                                               │
                 ▼                                               ▼
         Modal <Dialog>                                 Slideout <Sheet>
  - Centered modal dialog                        - Slides out from the right (`side="right"`)
  - `className="max-w-2xl! w-full p-0 border-0"` - `className="w-full sm:max-w-4xl p-0 flex flex-col"`
  - E.g.: `delivery-vehicle-form.tsx`            - Scrollable body + pinned header & footer
                                                 - E.g.: `trade-document-form.tsx`
```

---

## 2. Standard Slideout Sheet Architecture (`*-form.tsx`)

Reference implementation:
- [trade-document-form.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/shared/components/master-data/trade-documents/trade-document-form.tsx)

### Key Architectural Traits
1. **Root Layout**: `<Sheet open={open} onOpenChange={onOpenChange}>` + `<SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col">`.
2. **Pinned Header**: `<SheetHeader className="bg-primary text-primary-foreground px-5 py-3 shrink-0">`.
3. **Scrollable Form Body**: `<div className="flex-1 overflow-y-auto px-5 py-4">`.
4. **Fieldset Sections**: Segmented logical blocks with `<fieldset className="border rounded-lg p-4 space-y-4">` and `<legend className="text-sm font-semibold text-slate-700 px-1">`.
5. **Cascading Filters**: Selecting a Tier 1 (Type) cascades down to filter options in Tier 2 (Group `TreeSelect`).
6. **Embedded Child Table**: If the catalog links dynamic child requirements or specifications, render `<ResizableWrapTable>` inside the form with `maxBodyHeight={300}`.
7. **Pinned Footer**: `<div className="flex justify-end gap-3 px-5 py-3 border-t shrink-0 bg-slate-50/50">` with `Button type="submit" form="entity-form-id"`.

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TFunction } from 'i18next';
import { Save, FileText, Filter, X } from 'lucide-react';

import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Switch,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Combobox,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@shared/ui';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { CustomSelect } from '@shared/components/custom/custom-select';
import { CustomMultiSelect } from '@shared/components/custom/custom-multi-select';
import {
  ResizableWrapTable,
  type ResizableWrapTableColumn,
} from '@shared/components/resizable-wrap-table';
import { useFormPermissions } from '@shared/permission';
import { useMyCatalog } from '@shared/hooks/master-data/use-my-catalog';
import { useMyEntityGroup } from '@shared/hooks/master-data/use-my-entity-group';
import { useMyEntityType } from '@shared/hooks/master-data/use-my-entity-type';
import { useMyChildRequirement } from '@shared/hooks/master-data/use-my-child-requirement';
import TreeSelect from '@shared/components/custom/tree-select';
import { buildTreeSelect } from '@shared/lib/tree-utils';
import { MasterDataStatus } from '@shared/enums';

// ─── 1. Validation Schema ───────────────────────────────────────────────────
const createSchema = (t: TFunction) =>
  z.object({
    name: z
      .string()
      .min(
        1,
        t('myCatalog:validation.nameRequired', { defaultValue: 'Tên không được để trống' }),
      )
      .trim(),
    code: z.string().optional(),
    description: z.string().optional(),
    myEntityGroupId: z.string().optional().nullable(),
    childRequirementIds: z.array(z.string()).default([]),
    status: z.boolean().optional(),
  });

type FormValues = z.infer<ReturnType<typeof createSchema>>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id?: string;
  mode: 'create' | 'edit';
  permissionModule?: string;
};

export function MyCatalogForm({ id, mode, open, onOpenChange, permissionModule }: Props) {
  const { t } = useTranslation(['message', 'myCatalog', 'action', 'common']);
  const { canSave, isReadOnly } = useFormPermissions(permissionModule ?? '', mode);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');

  // Primary Catalog Entity Query & Mutations
  const { getByIdQuery, createMutation, updateMutation } = useMyCatalog({
    id: mode === 'edit' ? id : undefined,
    queryParam: {
      getById: {
        isEnable: open && mode === 'edit',
        includes: ['MyCatalogRequirements', 'MyEntityGroup'],
      },
    },
  });

  // Type Dropdown (for cascading filter into group)
  const { dropdownQuery: typeDropdownQuery } = useMyEntityType({
    queryParam: { dropdown: { isEnable: open } },
  });

  // Group Dropdown (filtered by selectedTypeId if present)
  const { allQuery: groupAllQuery } = useMyEntityGroup({
    queryParam: {
      all: {
        isEnable: open,
        params: { myEntityTypeId: selectedTypeId || undefined },
        filterKeys: ['myEntityTypeId'],
      },
    },
  });

  // Child Requirements Dropdown & All Query
  const { dropdownQuery: requirementDropdown, allQuery: requirementAllQuery } =
    useMyChildRequirement({
      queryParam: { dropdown: { isEnable: open }, all: { isEnable: open } },
    });

  const form = useForm<FormValues>({
    resolver: zodResolver(createSchema(t)),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      myEntityGroupId: '',
      childRequirementIds: [],
      status: true,
    },
  });

  const selectedReqIds = form.watch('childRequirementIds') ?? [];

  // Map selected IDs to full objects for the embedded child table
  const selectedRequirements = useMemo(() => {
    const all = requirementAllQuery.data?.data ?? [];
    const map = new Map(all.map((item: any) => [item.id, item]));
    return selectedReqIds.map((rid) => map.get(rid)).filter(Boolean);
  }, [selectedReqIds, requirementAllQuery.data]);

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && getByIdQuery.data) {
        const data = getByIdQuery.data.data;
        if (data?.myEntityGroup?.myEntityTypeId) {
          setSelectedTypeId(data.myEntityGroup.myEntityTypeId);
        }
        form.reset({
          name: data?.name ?? '',
          code: data?.code ?? '',
          description: data?.description ?? '',
          myEntityGroupId: data?.myEntityGroupId ?? '',
          childRequirementIds: data?.myCatalogRequirements?.map((x: any) => x.requirementId) ?? [],
          status: data?.status !== MasterDataStatus.Inactive,
        });
      } else if (mode === 'create') {
        setSelectedTypeId('');
        form.reset({
          name: '',
          code: '',
          description: '',
          myEntityGroupId: '',
          childRequirementIds: [],
          status: true,
        });
      }
    }
  }, [open, mode, getByIdQuery.data, form]);

  const handleSubmit = async (values: FormValues) => {
    if (!canSave) return;

    const payload = {
      ...values,
      myEntityGroupId: values.myEntityGroupId || null,
      status:
        mode === 'create'
          ? MasterDataStatus.Active
          : values.status
            ? MasterDataStatus.Active
            : MasterDataStatus.Inactive,
    };

    if (mode === 'create') {
      await createMutation.mutateAsync(payload);
      form.reset();
      return;
    }

    if (!id) return;
    await updateMutation.mutateAsync({ id, data: payload });
    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedTypeId('');
    form.reset();
  };

  // Columns for the embedded child requirements table
  const reqColumns: ResizableWrapTableColumn<any>[] = useMemo(
    () => [
      {
        id: 'code',
        header: t('myCatalog:columnTitle.reqCode', { defaultValue: 'Mã trường' }),
        defaultWidth: 120,
        cell: (row) => <span className="font-mono text-primary font-medium">{row.code}</span>,
      },
      {
        id: 'name',
        header: t('myCatalog:columnTitle.reqName', { defaultValue: 'Tên trường' }),
        defaultWidth: 240,
        cell: (row) => <span>{row.name}</span>,
      },
    ],
    [t],
  );

  if (mode === 'edit' && getByIdQuery.isFetching) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col">
          <div className="px-5 py-4 min-h-50 flex items-center justify-center">
            <div className="text-muted-foreground">{t('message:loading')}</div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col">
        {/* Pinned Sheet Header */}
        <SheetHeader className="bg-primary text-primary-foreground px-5 py-3 shrink-0">
          <SheetTitle className="text-primary-foreground flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {mode === 'create' ? t('action:add') : t('action:edit')}{' '}
            {t('myCatalog:title', { defaultValue: 'Danh mục' })}
          </SheetTitle>
        </SheetHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Form {...form}>
            <form
              id="my-catalog-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-5"
            >
              {/* Section 1: Basic Information */}
              <fieldset className="border rounded-lg p-4 space-y-4">
                <legend className="text-sm font-semibold text-slate-700 px-1">
                  {t('myCatalog:section.basicInfo', { defaultValue: 'Thông tin cơ bản' })}
                </legend>

                <div className="grid grid-cols-2 gap-4">
                  {mode === 'edit' && (
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t('myCatalog:columnTitle.code', { defaultValue: 'Mã' })}
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
                      <FormItem className={mode === 'create' ? 'col-span-2' : ''}>
                        <FormLabel>
                          {t('myCatalog:columnTitle.name', { defaultValue: 'Tên danh mục' })} *
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            disabled={isReadOnly}
                            placeholder={t('myCatalog:placeholder.name', {
                              defaultValue: 'Nhập tên danh mục...',
                            })}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('myCatalog:columnTitle.description', { defaultValue: 'Mô tả' })}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value ?? ''}
                          disabled={isReadOnly}
                          rows={2}
                          placeholder={t('myCatalog:placeholder.description', {
                            defaultValue: 'Nhập mô tả chi tiết...',
                          })}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>

              {/* Section 2: Group Hierarchy Link with Cascading Filter */}
              <fieldset className="border rounded-lg p-4 space-y-4">
                <legend className="text-sm font-semibold text-slate-700 px-1">
                  {t('myCatalog:section.groupConfig', { defaultValue: 'Phân loại & Nhóm' })}
                </legend>

                <FormField
                  control={form.control}
                  name="myEntityGroupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('myCatalog:columnTitle.group', { defaultValue: 'Nhóm danh mục' })}
                      </FormLabel>
                      <div className="flex gap-2">
                        <div className="flex-1 min-w-0">
                          <FormControl>
                            <TreeSelect
                              className="w-full"
                              loading={groupAllQuery.isFetching}
                              options={buildTreeSelect(groupAllQuery.data?.data) || []}
                              error={groupAllQuery.error}
                              onRetry={() => groupAllQuery.refetch()}
                              value={field.value ? [field.value] : []}
                              onValueChange={(value) => field.onChange(value[0])}
                              disabled={isReadOnly}
                              placeholder={t('myCatalog:placeholder.selectGroup', {
                                defaultValue: 'Chọn nhóm danh mục...',
                              })}
                            />
                          </FormControl>
                        </div>

                        {/* Cascading Filter Popover by Type */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant={selectedTypeId ? 'default' : 'outline'}
                              size="icon"
                              className="shrink-0"
                              title={t('common:filter', { defaultValue: 'Bộ lọc' })}
                            >
                              <Filter className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-80">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">
                                  {t('myCatalog:filterGroupByType', {
                                    defaultValue: 'Lọc nhóm theo loại',
                                  })}
                                </h4>
                                {selectedTypeId && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-muted-foreground"
                                    onClick={() => {
                                      setSelectedTypeId('');
                                      form.setValue('myEntityGroupId', '');
                                    }}
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    {t('action:clear', { defaultValue: 'Xóa lọc' })}
                                  </Button>
                                )}
                              </div>
                              <Combobox
                                options={
                                  typeDropdownQuery.data?.data?.map((item: any) => ({
                                    label: item.name,
                                    value: item.id,
                                  })) ?? []
                                }
                                value={selectedTypeId}
                                onValueChange={(val) => {
                                  setSelectedTypeId(val);
                                  form.setValue('myEntityGroupId', '');
                                }}
                                placeholder={t('myCatalog:placeholder.selectType', {
                                  defaultValue: 'Chọn loại để lọc...',
                                })}
                                loading={typeDropdownQuery.isLoading}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>

              {/* Section 3: Child Requirements with Embedded Table */}
              <fieldset className="border rounded-lg p-4 space-y-3">
                <legend className="text-sm font-semibold text-slate-700 px-1">
                  {t('myCatalog:section.requirements', {
                    defaultValue: 'Trường thông tin yêu cầu đi kèm',
                  })}
                </legend>

                <FormField
                  control={form.control}
                  name="childRequirementIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <CustomMultiSelect
                          placeholder={t('myCatalog:placeholder.selectRequirements', {
                            defaultValue: 'Tìm và chọn các trường yêu cầu...',
                          })}
                          options={
                            requirementDropdown.data?.data?.map((item: any) => ({
                              label: item.name,
                              value: item.id,
                            })) ?? []
                          }
                          selected={(field.value as string[]) ?? []}
                          onChange={field.onChange}
                          disabled={isReadOnly}
                          loading={requirementDropdown.isFetching}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedRequirements.length > 0 && (
                  <ResizableWrapTable
                    columns={reqColumns}
                    data={selectedRequirements}
                    getRowId={(row) => row.id}
                    maxBodyHeight={300}
                    emptyMessage={t('common:noData', { defaultValue: 'Không có dữ liệu' })}
                  />
                )}
              </fieldset>

              {/* Section 4: Status Switch */}
              {mode === 'edit' && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-xs">
                      <div className="space-y-0.5">
                        <FormLabel>
                          {t('myCatalog:columnTitle.status', { defaultValue: 'Trạng thái' })}
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
            </form>
          </Form>
        </div>

        {/* Pinned Sheet Footer */}
        <div className="flex justify-end gap-3 px-5 py-3 border-t shrink-0 bg-slate-50/50">
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('action:cancel', { defaultValue: 'Hủy' })}
          </Button>
          {canSave && (
            <Button
              type="submit"
              form="my-catalog-form"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {t('action:save', { defaultValue: 'Lưu' })}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```
