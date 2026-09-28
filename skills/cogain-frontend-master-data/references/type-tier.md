# Tier 1: Loại (Types) — Modal Dialog Pattern

Tier 1 master data entities represent elementary classifications (e.g., `DeliveryVehicleType`, `TradeDocumentType`, `AssetType`, `DocumentType`). They feature a lean data contract, typically consisting of `code`, `name`, `status`, and optional `description`.

---

## 1. Architectural Characteristics

| Dimension | Standard Specification |
| :--- | :--- |
| **Form Presentation** | **Modal `Dialog`** (`max-w-2xl! w-full p-0 border-0`) |
| **Field Count** | Low (< 6 fields: `code`, `name`, `status`, optional `description`) |
| **Table Component** | `CustomTable` or `ResizableWrapTable` with pagination and sorting |
| **Data Hierarchy** | Flat (no `parentId`, no recursive tree) |
| **Code Generation** | Optional code generation via `useGenerationCode` |
| **Export / Import** | Standard Excel Export and Import |

---

## 2. Standard Form Component (`*-type-form.tsx`)

Reference implementations:
- [delivery-vehicle-type-form.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/shared/components/master-data/delivery-vehicles/delivery-vehicle-type-form.tsx)
- [trade-document-type-form.tsx](file:///c:/Users/Admin/Desktop/CogainCore/cogain-core/frontend/shared/components/master-data/trade-documents/trade-document-type-form.tsx)

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
} from '@shared/ui';
import { Input } from '@shared/ui/input';
import { useFormPermissions } from '@shared/permission';
import { useMyEntityType } from '@shared/hooks/master-data/use-my-entity-type';
import { MasterDataStatus } from '@shared/enums';

// ─── 1. Zod Validation Schema with Localization ─────────────────────────────
const createSchema = (t: TFunction) =>
  z.object({
    name: z
      .string()
      .min(
        1,
        t('myEntityType:validation.nameRequired', {
          defaultValue: 'Tên không được để trống',
        }),
      )
      .trim(),
    code: z.string().optional(),
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

export function MyEntityTypeForm({ id, mode, open, onOpenChange, permissionModule }: Props) {
  const { t } = useTranslation(['message', 'myEntityType', 'action', 'common']);
  const { canSave, isReadOnly } = useFormPermissions(permissionModule ?? '', mode);

  const { getByIdQuery, createMutation, updateMutation } = useMyEntityType({
    id: mode === 'edit' ? id : undefined,
    queryParam: {
      getById: { isEnable: open && mode === 'edit' },
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(createSchema(t)),
    defaultValues: {
      name: '',
      code: '',
      status: true,
    },
  });

  useEffect(() => {
    if (open && mode === 'edit' && getByIdQuery.data) {
      form.reset({
        name: getByIdQuery.data.data?.name ?? '',
        code: getByIdQuery.data.data?.code ?? '',
        status: getByIdQuery.data.data?.status !== MasterDataStatus.Inactive,
      });
    } else if (open && mode === 'create') {
      form.reset({
        name: '',
        code: '',
        status: true,
      });
    }
  }, [open, mode, getByIdQuery.data, form]);

  const handleSubmit = async (values: FormValues) => {
    if (!canSave) return;

    if (mode === 'create') {
      await createMutation.mutateAsync({
        name: values.name,
        code: values.code ?? '',
        status: MasterDataStatus.Active,
      });
      form.reset({
        name: '',
        code: '',
        status: true,
      });
      return;
    }

    if (!id) return;

    await updateMutation.mutateAsync({
      id,
      data: {
        name: values.name,
        code: values.code ?? '',
        status: values.status ? MasterDataStatus.Active : MasterDataStatus.Inactive,
      },
    });

    handleClose();
  };

  const handleClose = () => {
    onOpenChange(false);
    form.reset();
  };

  // Loading skeleton inside modal
  if (mode === 'edit' && getByIdQuery.isFetching) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl! w-full p-0 border-0" showCloseButton={false}>
          <div className="px-5 py-4 min-h-[200px] flex items-center justify-center">
            <div className="text-muted-foreground">
              {t('message:loading', { defaultValue: 'Đang tải dữ liệu...' })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl! w-full p-0 border-0" showCloseButton={false}>
        {/* Modal Header */}
        <DialogHeader className="bg-primary text-primary-foreground px-5 py-3 rounded-t-lg">
          <DialogTitle className="text-primary-foreground">
            {mode === 'create'
              ? t('action:add', { defaultValue: 'Thêm' })
              : t('action:edit', { defaultValue: 'Chỉnh sửa' })}{' '}
            {t('myEntityType:title', { defaultValue: 'Loại danh mục' })}
          </DialogTitle>
        </DialogHeader>

        {/* Modal Body */}
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
                        {t('myEntityType:columnTitle.code', { defaultValue: 'Mã' })}
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
                      {t('myEntityType:columnTitle.name', { defaultValue: 'Tên' })} *
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isReadOnly}
                        placeholder={t('myEntityType:placeholder.name', {
                          defaultValue: 'Nhập tên loại...',
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
                          {t('myEntityType:columnTitle.status', {
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

              {/* Modal Footer Buttons */}
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

## 3. Standard List Page Component (`*-type-page.tsx`)

Tier 1 pages render a flat table with column filtering, pagination, and bulk actions.

Key requirements:
1. `useTableChange` for synchronized URL query state (`updateFilters`, `sorting`, `pagination`).
2. `useGenerationCode` integration for auto-generating codes when clicking "Add".
3. `ModifierInfo` component in the modified column.
4. `StatusTag` for active/inactive status display.
5. `ExportButton` and `ImportButton` for standard data management.
