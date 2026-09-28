---
name: cogain-backend-cross-service-table
description: Expert guide for creating intermediate tables (child collections) that connect n-to-n data between two microservices or within the same microservice in cogain-core. Activate when the user asks to "create intermediate table", "create cross-service table", "add child collection", or "tạo bảng trung gian".
---

# Cross-Service / Child Collection Table Guide

This skill provides step-by-step instructions for AI agents to create an intermediate table (e.g., `[ParentEntity][ChildEntity]`) as a child collection for a Parent Entity within the `cogain-core` Microservices architecture.

## 1. Mandatory Architectural Rules

- **Microservice Isolation:** If the Child table belongs to a different microservice, **NEVER** define a foreign key or Navigation Property to the Child entity. Store only `[ChildEntity]Id` and snapshot fields (`[ChildEntity]CodeSnapshot`, `[ChildEntity]NameSnapshot`).
- **Entity Inheritance:** The intermediate table must inherit from `EntityAuditBase<Guid>` and be declared using `record`.
- **Parent Entity Navigation:** Add `public virtual ICollection<[IntermediateEntity]> [CollectionName] { get; set; } = [];` to the Parent Entity.
- **DTOs:** Parent DTOs (`Dto`, `CreateDto`, `UpdateDto`) must include an `ICollection` holding the intermediate table DTOs. Intermediate DTOs must inherit from `EntityBaseDto<Guid>` (or appropriate base classes for Create/Update).
- **AutoMapper:** 
  - Register `CreateMap` for the intermediate DTOs in `MappingProfile.cs`.
  - **Critical Rule:** In `CreateMap<Update[ParentEntity]Dto, [ParentEntity]>`, add `.ForMember(d => d.[CollectionName], opt => opt.Ignore())` to prevent EF Core tracking errors. Child collection reconciliation is handled by `ISyncsChildren` or `BaseService.ReconcileCollections`.
- **BaseService Reconciliation:** To enable automated `ReconcileCollections` (automatic Add/Update/Delete during PUT updates), update `GetUpdateIncludeString()` in the Parent Entity Service to include `"[CollectionName]"` in the return string (e.g., `"Details,Certificates"`).
- **Database Migrations:** **NEVER** run migration commands automatically (`dotnet ef migrations add`, `dotnet ef database update`). All migrations must be executed manually by the user.

## 2. Implementation Workflow

1. **Gather Information:**
   - Parent Entity (Name, Microservice, Namespace).
   - Child Entity (Name, Microservice, Namespace).
   - Intermediate table name (typically `[Parent][Child]`).
   - Collection property name on Parent (e.g., `Certificates`, `Details`).
   - Additional payload/metadata fields required by the user.

2. **Generate Code from Templates (use `view_file` to read templates):**
   - **Entity Layer:** Read `resources/entity.template.md` and create the file in the Parent's Entity folder.
   - **Configuration Layer:** Read `resources/configuration.template.md` and create the file in the Parent's Persistence/Configurations folder.

3. **Update Existing Code (use `replace_file_content`):**
   - **Parent Entity:** Add `public virtual ICollection<[IntermediateEntity]> [CollectionName] { get; set; } = [];`.
   - **DTOs (`[ParentEntity]Dto.cs`):** 
     - Add `[IntermediateEntity]Dto`, `Create[IntermediateEntity]Dto`, `Update[IntermediateEntity]Dto`.
     - Embed the collection in the Parent DTOs.
   - **AutoMapper (`MappingProfile.cs`):** 
     - Add `CreateMap` for the intermediate DTOs.
     - Add `.ForMember(d => d.[CollectionName], opt => opt.Ignore())` to the Parent's Update mapping.
   - **Service (`[ParentEntity]Service.cs`):** 
     - In `GetUpdateIncludeString()`, include `"[CollectionName]"` so `BaseService` includes the collection during update reconciliation.

## 3. Reference Templates

- **Entity**: [resources/entity.template.md](resources/entity.template.md)
- **Configuration**: [resources/configuration.template.md](resources/configuration.template.md)
