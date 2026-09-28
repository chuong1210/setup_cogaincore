# Frontend Architecture for Request Tickets ("Phiếu")

This document details the frontend engineering patterns for request tickets and business documents ("Phiếu") in `cogain-core`, modeled after the production implementation in `frontend/bizdoc/src/routes/_app/attendance/overtime/`.

---

## 1. Directory Structure

Place all files for the ticket module within a dedicated route folder:

```text
frontend/<app>/src/
├── types/
│   └── <ticket>.type.ts                # Entity interfaces, DTOs, and enum exports
├── services/
│   └── <ticket>-service.ts             # BaseService wrapper + changeStep + custom endpoints
└── routes/_app/<feature>/<ticket>/
    ├── index.tsx                       # Data table with status badges & filter popover
    ├── $id/detail.tsx                  # Master-detail view, edit form & workflow stepper
    ├── -components/
    │   ├── <ticket>-form.tsx           # Header form (Code, RefDoc, Date, Supervisor)
    │   ├── <ticket>-detail-table.tsx   # Dynamic child collection editor
    │   ├── <ticket>-filter-popover.tsx # WorkItem virtual filter drawer
    │   └── supervisor-confirm-modal.tsx# Custom approval dialog with actual time inputs
    └── -hooks/
        └── use-<ticket>.ts             # TanStack Query query/mutation hooks
```

---

## 2. TypeScript Types & Snapshot Representation

Always mirror backend snapshot fields on frontend interfaces.

```typescript
// types/sample-ticket.type.ts
import type { BaseType, IWorkItem, IWorkItemInfo } from '@shared/types';

export interface ISampleTicketRequest extends BaseType {
  id: string;
  code?: string | null;
  date: Date | string;

  // Reference document (RefDoc)
  refType?: string | null;
  refDocNum?: string | null;
  refTypeId?: string | null;
  refDocId?: string | null;

  // Header Foreign Keys & Snapshots
  supervisorId?: string | null;
  supervisorCodeSnapshot?: string | null;
  supervisorNameSnapshot?: string | null;
  supervisorNote?: string | null;

  departmentId?: string | null;
  departmentCodeSnapshot?: string | null;
  departmentNameSnapshot?: string | null;

  completionRate?: number | null;

  // Child collections
  details?: ISampleTicketDetail[];
  attachments?: ISampleTicketAttachment[];

  // Workflow integration
  workItemId?: string;
  workItem?: IWorkItem;
  workItemInfo?: IWorkItemInfo;
}

export interface ISampleTicketDetail {
  id?: string;
  sampleTicketRequestId?: string;

  // Item/Resource reference & snapshot
  itemId: string;
  itemCodeSnapshot?: string;
  itemNameSnapshot?: string;

  // Project reference & snapshot
  projectId: string;
  projectCodeSnapshot?: string;
  projectNameSnapshot?: string;

  quantity: number;
  unitPrice?: number;
  totalAmount?: number;
  note?: string;
}

export interface ISampleTicketAttachment {
  id?: string;
  name: string;
  url: string;
  type: string;
  size: number;
}
```

> [!TIP]
> **Reading Snapshots vs IDs**: In data tables, export views, and read-only detail panels, always render `itemCodeSnapshot - itemNameSnapshot` rather than looking up details via extra network requests.

---

## 3. Service Layer (`services/<ticket>-service.ts`)

Leverage `createBaseService` from `@shared/services` for standard CRUD, and append workflow transition (`changeStep`) and export/import endpoints:

```typescript
import { getApi } from '@/lib/api-client';
import { createBaseService } from '@shared/services';
import type { ApiResponse } from '@shared/types';
import type { ISampleTicketRequest } from '@/types/sample-ticket.type';

const controller = '/servicedesk/sample-tickets';

export interface ChangeStepRequest {
  currentStepId: string;
  actionCode: string;
  comment?: string;
}

const baseService = createBaseService<ISampleTicketRequest>({
  api: getApi,
  controller,
});

export const sampleTicketService = {
  ...baseService,

  changeStep: async (
    id: string,
    body: ChangeStepRequest,
  ): Promise<ApiResponse<ISampleTicketRequest>> => {
    const res = await getApi().post<ApiResponse<ISampleTicketRequest>>(
      `${controller}/${id}/change-step`,
      body,
    );
    return res.data;
  },

    const res = await getApi().get<ApiResponse<string>>(
      `${controller}/export-excel`,
      { params },
    );
    return res.data;
  },
};
```

### 3.1. Hook Layer (`-hooks/use-<ticket>.ts`)
> [!IMPORTANT]
> **Strict Prohibition of Direct Service & Raw `useQuery` in UI**:
> UI components and route pages **MUST NEVER call `sampleTicketService` directly** or declare inline `useQuery`/`useMutation`. All queries and mutations must be encapsulated inside `use<Ticket>`, and UI components only consume the hook.

```typescript
// -hooks/use-sample-ticket.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sampleTicketService, type ChangeStepRequest } from '@/services/sample-ticket-service';

export function useSampleTicket({ id, queryParam }: any = {}) {
  const queryClient = useQueryClient();

  const pagingQuery = useQuery({
    queryKey: ['sample-ticket', 'paging', queryParam?.paging],
    queryFn: () => sampleTicketService.getPaged(queryParam?.paging?.params),
    enabled: queryParam?.paging?.isEnable,
  });

  const getByIdQuery = useQuery({
    queryKey: ['sample-ticket', id, queryParam?.getById?.includes],
    queryFn: () => sampleTicketService.getById(id!, queryParam?.getById?.includes),
    enabled: !!id && queryParam?.getById?.isEnable,
  });

  const changeStepMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChangeStepRequest }) =>
      sampleTicketService.changeStep(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sample-ticket'] });
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: (params?: any) => sampleTicketService.exportData(params),
  });

  return {
    pagingQuery,
    getByIdQuery,
    changeStepMutation,
    exportDataMutation,
  };
}
```

## 4. List Page Architecture & Dedicated `<Ticket>FilterPopover` (`index.tsx`)

> [!IMPORTANT]
> **Strict Prohibition of Raw Inline Filter Toolbars**:
> - **NEVER** combine raw inline `<select>` tags or ad-hoc filters directly into the toolbar of list screens.
> - **MANDATORY**: Build a dedicated `<[Ticket]FilterPopover>` component using **`FilterPopoverLayout`** (from `@shared/components`). Reference: `AcceptanceMinuteFilterPopover` or `InstallationOrderFilterPopover`.
> - The popover trigger must display a `Filter` icon, label "Lọc", and an active badge when `filterCount > 0`.
> - Inside the popover: provide domain filters (e.g. `ProjectCombobox`, status dropdown with icons/badges, steps, date ranges, number ranges) with built-in Apply and Reset buttons.

### 4.1. Standard `<Ticket>FilterPopover` Component

```tsx
// -components/sample-ticket-filter-popover.tsx
import { FilterPopoverLayout } from '@shared/components';
import { ProjectCombobox } from '@/components/common/project-combobox';
import { CustomSelect } from '@shared/components/custom/custom-select';
import { NumericInput } from '@shared/ui';
import { useTranslation } from 'react-i18next';
import type { IWorkItemStatus } from '@shared/types';

export type SampleTicketFilterValues = {
  projectId?: string;
  statusCode?: string;
  stepId?: string;
  refDocId?: string;
  quantityFrom?: string;
  quantityTo?: string;
};

export interface SampleTicketFilterPopoverProps {
  statuses?: IWorkItemStatus[];
  currentProjectId?: string;
  currentStatusCode?: string;
  currentStepId?: string;
  currentRefDocId?: string;
  currentQuantityFrom?: string;
  currentQuantityTo?: string;
  onApply: (next: SampleTicketFilterValues) => void;
  onClear: () => void;
  filterCount?: number;
}

export function SampleTicketFilterPopover({
  statuses: _statuses,
  currentProjectId,
  currentStatusCode,
  currentStepId,
  currentRefDocId,
  currentQuantityFrom,
  currentQuantityTo,
  onApply,
  onClear,
  filterCount = 0,
}: SampleTicketFilterPopoverProps) {
  const { t } = useTranslation(['sampleTicket', 'common', 'action']);

  const current: SampleTicketFilterValues = {
    projectId: currentProjectId,
    statusCode: currentStatusCode,
    stepId: currentStepId,
    refDocId: currentRefDocId,
    quantityFrom: currentQuantityFrom,
    quantityTo: currentQuantityTo,
  };

  return (
    <FilterPopoverLayout<SampleTicketFilterValues>
      current={current}
      onApply={onApply}
      onClear={onClear}
      filterCount={filterCount}
      align="start"
      title={t('sampleTicket:filter.title', { defaultValue: 'Bộ lọc' })}
      step={{
        categoryCode: 'SampleTicket',
        label: t('sampleTicket:columns.step', { defaultValue: 'Bước quy trình' }),
        placeholder: t('common:placeholder.allSteps', { defaultValue: 'Tất cả bước' }),
      }}
      refDoc={{ workItemCategoryCode: 'SampleTicket' }}
      status={{
        label: t('sampleTicket:columns.status', { defaultValue: 'Trạng thái bước' }),
        placeholder: t('common:placeholder.selectStatus', { defaultValue: 'Chọn trạng thái' }),
      }}
    >
      {({ draft, setDraft }) => (
        <>
          {/* Custom Project Filter */}
          <div className="flex flex-col space-y-1.5 col-span-2">
            <label className="text-xs font-semibold text-muted-foreground">
              {t('sampleTicket:filter.project', { defaultValue: 'Dự án' })}
            </label>
            <ProjectCombobox
              value={draft.projectId}
              onValueChange={(val) => setDraft((d) => ({ ...d, projectId: val || undefined }))}
              placeholder={t('sampleTicket:placeholder.selectProject', { defaultValue: 'Chọn dự án' })}
              clearable
              popoverClassName="w-[320px]"
            />
          </div>

          {/* Custom Range Filter */}
          <div className="flex flex-col space-y-1.5 col-span-2">
            <label className="text-xs font-semibold text-muted-foreground">
              {t('sampleTicket:filter.quantity', { defaultValue: 'Số lượng' })}
            </label>
            <div className="flex items-center gap-2">
              <NumericInput
                size="sm"
                value={draft.quantityFrom ?? ''}
                onValueChange={(val) =>
                  setDraft((d) => ({ ...d, quantityFrom: val != null ? String(val) : undefined }))
                }
                placeholder={t('common:from', { defaultValue: 'Từ' })}
                className="h-9 shadow-none border-gray-200"
              />
              <span className="text-xs text-muted-foreground">-</span>
              <NumericInput
                size="sm"
                value={draft.quantityTo ?? ''}
                onValueChange={(val) =>
                  setDraft((d) => ({ ...d, quantityTo: val != null ? String(val) : undefined }))
                }
                placeholder={t('common:to', { defaultValue: 'Đến' })}
                className="h-9 shadow-none border-gray-200"
              />
            </div>
          </div>
        </>
      )}
    </FilterPopoverLayout>
  );
}
```

---

## 5. Slideout Form Architecture (`Sheet`) & Header Controls

> [!IMPORTANT]
> **MANDATORY SLIDEOUT PRESENTATION FOR TICKETS ("Phiếu")**:
> Form components for all business tickets and documents **must strictly be implemented as a Slideout Sheet** (`Sheet` from `@shared/ui` with `side="right"`), **never as a basic modal dialog**.

### Structure of the Slideout Form:
1. **Container**: `<Sheet open={open} onOpenChange={onOpenChange}>`
2. **SheetContent**: `side="right"` with standardized **85% width**:
   ```tsx
   <SheetContent
     side="right"
     className="w-full sm:max-w-[85%] p-0 gap-0 border-l shadow-xl flex flex-col"
     onInteractOutside={(e) => e.preventDefault()}
   >
   ```
3. **SheetHeader**: Sticky top header with title and version badge:
   ```tsx
   <SheetHeader className="bg-white border-b px-6 py-4">
     <SheetTitle className="text-lg font-bold text-primary flex items-center gap-2">
       <span>
         {mode === 'create' 
           ? t('action:add', { defaultValue: 'Thêm mới' }) 
           : t('action:edit', { defaultValue: 'Cập nhật'})} {t('sampleTicket:title', { defaultValue: 'Phiếu yêu cầu' })}
       </span>
       <ResourceVersionBadge resourceName={`${WorkItemCategoryCode.SampleTicket}`} />
     </SheetTitle>
   </SheetHeader>
   ```
4. **Body**: Scrollable form content `<form className="flex-1 overflow-y-auto px-6 py-5 space-y-4">`.
5. **SheetFooter**: Sticky bottom footer `<SheetFooter className="border-t bg-muted/20 px-6 py-3">` containing `FormFooterAction` or Cancel/Save buttons.

```tsx
// -components/sample-ticket-form.tsx
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, Input,
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from '@shared/ui';
import { DatePicker, FormFooterAction, RefDocumentSelector, ResourceVersionBadge } from '@shared/components';
import { useRefDocSelector } from '@shared/hooks';
import { WorkItemCategoryCode } from '@shared/config/work-item-category-codes';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { SampleTicketDetailTable } from './sample-ticket-detail-table';

export function SampleTicketForm({ open, onOpenChange, mode, id }: SampleTicketFormProps) {
  const { t } = useTranslation(['sampleTicket', 'common', 'action']);
  const { selectorProps, isIndependent } = useRefDocSelector({ ... });

  const form = useForm<SampleTicketFormValues>({
    resolver: zodResolver(sampleTicketSchema(t)),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[85%] p-0 gap-0 border-l shadow-xl flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="bg-white border-b px-6 py-4">
          <SheetTitle className="text-lg font-bold text-primary flex items-center gap-2">
            <span>
              {mode === 'create'
                ? t('action:add', { defaultValue: 'Thêm mới' })
                : t('action:edit', { defaultValue: 'Cập nhật' })}{' '}
              {t('sampleTicket:title', { defaultValue: 'Phiếu yêu cầu' })}
            </span>
            <ResourceVersionBadge resourceName={`${WorkItemCategoryCode.SampleTicket}`} />
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            id="sample-ticket-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex-1 overflow-y-auto px-6 space-y-4"
          >
            {/* 1. Reference Document Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RefDocumentSelector
                {...selectorProps}
                isIndependent={isIndependent}
                className="space-y-0 w-full"
              />
            </div>

            {/* 2. Header Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-muted/30 p-4 rounded-xl border">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel isRequired>
                      {t('sampleTicket:date', { defaultValue: 'Ngày áp dụng' })}
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 3. Detail Child Table */}
            <SampleTicketDetailTable />
          </form>
        </Form>

        <SheetFooter className="border-t bg-muted/20 px-6 py-3">
          <FormFooterAction
            onCancel={() => onOpenChange(false)}
            isPending={form.formState.isSubmitting}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

---

## 6. Dynamic Detail Tables & Child Collections (Mandatory Search & Filter)

> [!IMPORTANT]
> **Data Table Standards for Child Collections**:
> - **NEVER use raw HTML `<table>`**.
> - **Use `ResizableWrapTable`** (from `@shared/components/resizable-wrap-table`) as the standard for all child grids and detail tables.
> - **MANDATORY SEARCH & FILTER IN EVERY DETAIL TABLE**:
>   Every detail table MUST have both search and filter popover configured via `toolbarProps`.
> - **Zero Hardcoded Strings**: All table headers, search placeholders, filter titles, counts, and empty states MUST use `useTranslation` with fallback `defaultValue`.
> - **Wide Multi-Column Filter Layout**: `renderFilterContent: (close) => <form className="space-y-4 w-200">` with a multi-column responsive grid (`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`) and Reset / Apply buttons.

### Standard Child Grid with `ResizableWrapTable` and `toolbarProps`

```tsx
// -components/sample-ticket-detail-table.tsx
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Combobox, Button } from '@shared/ui';
import { ResizableWrapTable, type ResizableWrapTableColumn } from '@shared/components/resizable-wrap-table';
import type { ISampleTicketDetail } from '@/types/sample-ticket.type';

interface DetailFilters {
  projectId?: string;
  operationId?: string;
  costId?: string;
}

interface SampleTicketDetailTableProps {
  details: ISampleTicketDetail[];
  readOnly?: boolean;
}

export function SampleTicketDetailTable({ details, readOnly }: SampleTicketDetailTableProps) {
  const { t } = useTranslation(['sampleTicket', 'common', 'action']);
  const [searchText, setSearchText] = useState('');
  const [detailFilters, setDetailFilters] = useState<DetailFilters>({});

  // Client-side search and multi-criteria filtering
  const filteredDetails = useMemo(() => {
    return details.filter((item) => {
      const matchSearch =
        !searchText ||
        item.itemCodeSnapshot?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.itemNameSnapshot?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.projectCodeSnapshot?.toLowerCase().includes(searchText.toLowerCase()) ||
        item.projectNameSnapshot?.toLowerCase().includes(searchText.toLowerCase());

      const matchProject = !detailFilters.projectId || item.projectId === detailFilters.projectId;

      return matchSearch && matchProject;
    });
  }, [details, searchText, detailFilters]);

  const activeFilterCount = Object.values(detailFilters).filter(Boolean).length;

  // Column definitions with i18n headers and resizable widths
  const detailColumns = useMemo<ResizableWrapTableColumn<ISampleTicketDetail>[]>(
    () => [
      {
        id: 'employee',
        header: t('sampleTicket:detail.employee', { defaultValue: 'Nhân viên' }),
        defaultWidth: 220,
        minWidth: 160,
        cell: (row) => (
          <span>{row.employeeCodeSnapshot} - {row.employeeNameSnapshot}</span>
        ),
      },
      {
        id: 'project',
        header: t('sampleTicket:detail.project', { defaultValue: 'Dự án' }),
        defaultWidth: 200,
        minWidth: 150,
        cell: (row) => (
          <span>{row.projectCodeSnapshot} - {row.projectNameSnapshot}</span>
        ),
      },
      {
        id: 'quantity',
        header: t('sampleTicket:detail.quantity', { defaultValue: 'Số lượng' }),
        defaultWidth: 110,
        cell: (row) => <span className="font-semibold">{row.quantity ?? '—'}</span>,
      },
    ],
    [t]
  );

  return (
    <ResizableWrapTable<ISampleTicketDetail>
      columns={detailColumns}
      data={filteredDetails}
      getRowId={(row) => row.id ?? `${row.employeeId}-${row.sampleTicketId}`}
      emptyMessage={t('common:noData', { defaultValue: 'Không có dữ liệu' })}
      className="rounded-tl-none border-0 [&_thead_th]:bg-sub-primary! [&_thead_th]:text-foreground! [&_thead_th:first-child]:rounded-tl-none!"
      toolbarProps={{
        searchValue: searchText,
        onSearchChange: setSearchText,
        searchDebounce: 300,
        searchPlaceholder: t('sampleTicket:detail.searchPlaceholder', {
          defaultValue: 'Tìm kiếm theo mã, tên hoặc dự án...',
        }),
        filterLabel: t('common:filter', { defaultValue: 'Lọc' }),
        filterPopoverTitle: t('sampleTicket:detail.filterTitle', {
          defaultValue: 'Bộ lọc chi tiết',
        }),
        filterCount: activeFilterCount,
        totalCount: details.length,
        filteredCount: filteredDetails.length,
        renderFilterContent: (close) => (
          <form
            className="space-y-4 w-200"
            onSubmit={(e) => {
              e.preventDefault();
              close();
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Project Combobox */}
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-muted-foreground">
                  {t('sampleTicket:detail.project', { defaultValue: 'Dự án' })}
                </span>
                <Combobox
                  options={/* project options */ []}
                  value={detailFilters.projectId ?? ''}
                  onValueChange={(val) =>
                    setDetailFilters((prev) => ({ ...prev, projectId: val || undefined }))
                  }
                  placeholder={t('sampleTicket:placeholder.selectProject', { defaultValue: 'Chọn dự án' })}
                  buttonProps={{ className: 'w-full' }}
                />
              </div>

              {/* Operation / Category Combobox */}
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-muted-foreground">
                  {t('sampleTicket:detail.operation', { defaultValue: 'Công đoạn' })}
                </span>
                <Combobox
                  options={/* operation options */ []}
                  value={detailFilters.operationId ?? ''}
                  onValueChange={(val) =>
                    setDetailFilters((prev) => ({ ...prev, operationId: val || undefined }))
                  }
                  placeholder={t('sampleTicket:placeholder.selectOperation', { defaultValue: 'Chọn công đoạn' })}
                  buttonProps={{ className: 'w-full' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDetailFilters({})}
              >
                {t('action:reset', { defaultValue: 'Đặt lại' })}
              </Button>
              <Button type="submit" size="sm">
                {t('action:apply', { defaultValue: 'Áp dụng' })}
              </Button>
            </div>
          </form>
        ),
      }}
    />
  );
}
```

### Pattern B: Reorderable Child Grid with `SortableWrapTable`
When child lines must allow drag-and-drop vertical reordering (e.g. sequence of operations, itinerary stops):
```tsx
import { SortableWrapTable, type SortableWrapTableColumn } from '@shared/components/sortable-wrap-table';

// Use SortableWrapTable with onReorder:
<SortableWrapTable
  columns={sortableColumns}
  data={tableData}
  getRowId={(item) => item.id || `row-${item._index}`}
  onReorder={(newOrder) => {
    // replace or swap fields in useFieldArray
  }}
  enableDrag={!readOnly}
/>
```

---

## 6. Workflow Stepper & Step Transitions

In the `$id/detail.tsx` page:
1. Render the **Workflow Stepper** indicating current step, step status, and assigned actors.
2. Render available transition buttons dynamically from `item.workItemInfo?.actions` (e.g. Submit, Approve, Reject, Return).
3. When clicked, open a `CommentModal` (if action requires a note or reason) and execute `sampleTicketService.changeStep`.

```tsx
// Execution snippet in detail.tsx using custom hook (NEVER call service directly)
const { changeStepMutation } = useSampleTicket({ id });

const handleExecuteAction = async (action: IWorkItemAction, comment?: string) => {
  try {
    await changeStepMutation.mutateAsync({
      id,
      data: {
        currentStepId: item.workItem.currentStepId,
        actionCode: action.code,
        comment: comment ?? '',
      },
    });
    toastSuccess(t('message:actionSuccess', { defaultValue: `Thực hiện ${action.name} thành công.` }));
  } catch (error) {
    const apiError = error as ApiError;
    toastError(getErrorMessage(apiError, t('message:error', { defaultValue: 'Thao tác chuyển bước thất bại.' })));
  }
};
```

---

## 7. Ticket Version Badge (`ResourceVersionBadge`)

To maintain visibility of document features, versions, and changelogs for administrators and developers across environments, **every request ticket/document must display `ResourceVersionBadge`** (from `@shared/components`).

Use `WorkItemCategoryCode` as the enum key:
```tsx
<ResourceVersionBadge resourceName={`${WorkItemCategoryCode.SampleTicket}`} />
```

The version and changelog metadata are centrally registered in `frontend/shared/config/resource-version.json`:
```json
{
  "SampleTicket": {
    "version": "1.0",
    "description": "Initial release with snapshot policy and child collection reconciliation"
  }
}
```

> [!NOTE]
> `ResourceVersionBadge` internally checks if the current user is an admin (`useAuthStore`). If not an admin or if the resource has no version configured, it safely renders `null`.

### 1. In `WorkItemDetailLayout` Title
Wrap the title text and the badge in a flex container:
```tsx
<WorkItemDetailLayout
  workItemId={id}
  title={
    <div className="flex items-center gap-2">
      <span>{ticketData?.name || t('sampleTicket:title')}</span>
      <ResourceVersionBadge resourceName={`${WorkItemCategoryCode.SampleTicket}`} />
    </div>
  }
  status={
    <WorkItemStatusBadge
      status={workItemQuery.data?.data?.currentStep?.workItemStatus}
      variant="div"
    />
  }
  ...
/>
```

### 2. In Info Fields / Collapsible Info Grid (`isAdmin`)
Inside the read-only header card (e.g. `CollapsibleInfoGrid` or `InfoField` list), show the version field when `isAdmin`:
```tsx
const isAdmin = useAuthStore((s) => Boolean(s.user?.hasFullSystemAccess || (s.user as any)?.isAdmin));

// In the info fields grid:
{isAdmin && (
  <InfoField
    label={t('common:version', { defaultValue: 'Version' })}
    value={<ResourceVersionBadge resourceName={`${WorkItemCategoryCode.SampleTicket}`} />}
  />
)}
```

### 3. In Create / Edit Sheet or Modal Header
In `SheetTitle` or `DialogTitle`:
```tsx
<SheetTitle className="text-lg font-bold text-primary flex items-center gap-2">
  <span>
    {mode === 'create' ? t('action:add') : t('action:edit')} {t('sampleTicket:title')}
  </span>
  <ResourceVersionBadge resourceName={`${WorkItemCategoryCode.SampleTicket}`} />
</SheetTitle>
```

### 4. In List Page Header (`index.tsx`)
```tsx
<div className="text-xl font-bold flex items-center gap-2">
  <span>{t('title')}</span>
  <ResourceVersionBadge resourceName={`${WorkItemCategoryCode.SampleTicket}`} />
</div>
```


