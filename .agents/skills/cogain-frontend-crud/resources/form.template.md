Template for Create/Edit Dialog Form (e.g., `src/routes/_app/.../_components/[my-entity]-form.tsx`):

```typescript
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
  Input,
} from '@shared/ui';
import { useFormPermissions } from '@shared/permission';
import { needCheckPermission } from '@shared/permission/global.permission';
import { MasterDataStatus } from '@shared/enums';
import { useMyEntity } from '../_hooks/use-my-entity';

const createMyEntitySchema = (t: TFunction) =>
  z.object({
    name: z.string().min(1, t('myEntity:validation.nameRequired')).trim(),
    code: z.string().optional(),
    status: z.boolean().optional(),
  });

type MyEntityFormValues = z.infer<ReturnType<typeof createMyEntitySchema>>;

type MyEntityFormProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id?: string;
  mode: 'create' | 'edit';
  permissionModule?: string;
}>;

export function MyEntityForm({
  id,
  mode,
  open,
  onOpenChange,
  permissionModule,
}: MyEntityFormProps) {
  const { t } = useTranslation(['message', 'myEntity', 'action']);
  const { canSave, isReadOnly } = useFormPermissions(
    permissionModule ?? '',
    mode,
    needCheckPermission,
  );

  const { getByIdQuery, createMutation, updateMutation } = useMyEntity({
    id: mode === 'edit' ? id : undefined,
    queryParam: { getById: { isEnable: mode === 'edit' } },
  });

  const form = useForm<MyEntityFormValues>({
    resolver: zodResolver(createMyEntitySchema(t)),
    defaultValues: { name: '', code: '', status: true },
  });

  useEffect(() => {
    if (mode === 'edit' && getByIdQuery.data?.data) {
      form.reset({
        name: getByIdQuery.data.data.name ?? '',
        code: getByIdQuery.data.data.code ?? '',
        status: getByIdQuery.data.data.status === MasterDataStatus.Active,
      });
    }
  }, [mode, getByIdQuery.data, form]);

  const handleSubmit = async (values: MyEntityFormValues) => {
    if (!canSave) return;
    if (mode === 'create') {
      await createMutation.mutateAsync({
        name: values.name,
        code: values.code ?? '',
      });
      form.reset();
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
            {mode === 'create' ? t('action:add') : t('action:edit')} {t('myEntity:title')}
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
                      <FormLabel>{t('myEntity:columnTitle.code')}</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
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
                    <FormLabel>{t('myEntity:columnTitle.name')} *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('myEntity:placeholder.name')}
                        {...field}
                        disabled={isReadOnly}
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border px-3 py-2 h-9 shadow-sm">
                      <FormLabel>{t('myEntity:columnTitle.status')}</FormLabel>
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
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  {t('action:cancel')}
                </Button>
                {canSave && (
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {t('action:save')}
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
