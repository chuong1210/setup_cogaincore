---
name: cogain-backend-crud
description: Specialized instructions and standard templates to scaffold a new Backend CRUD API in cogain-core (using record, EntityAuditBase, BaseService). Activate when the user asks to "create backend crud", "scaffold backend API", "create API for Entity [Name]", or "tạo backend crud".
---

# Cogain-Core Backend CRUD Generation Guide

This skill guides AI agents in scaffolding complete, standardized Backend structures for a new CRUD API in `cogain-core`, adhering 100% to the latest project conventions (`record` syntax, combined DTO file, inheriting BaseController and BaseService).

## 1. Critical Rules

- **Use `record`**: All Entities and DTOs must be declared using the `record` keyword instead of `class`.
- **Entity Inheritance**: Entities must inherit from `EntityAuditBase<Guid>`. Do not manually declare an `Id` property inside the entity.
- **AutoFilter**: Add the `[AutoFilter]` attribute to the Entity class.
- **CodeGeneration Attribute**: Include `[CodeGeneration("[Entity Description]", EContextScope.[Microservice], typeof([EntityName]))]` above the Entity class declaration.
- **Consolidated DTOs**: All DTOs (`Dto`, `CreateDto`, `UpdateDto`, `CreateAndUpdateDto`, `FilterPaging`) must be placed together within a single file named `[EntityName]Dto.cs`.
- **Soft Delete Filter**: In `[EntityName]Configuration.cs`, index `Code` (if present) must specify `.HasFilter("\"deleted_date\" IS NULL")`.
- **Base Classes**: Service inherits `BaseService`, Interface inherits `IBaseService`, Controller inherits `BaseController` (or `BaseExcelController`).
- **Register Ocelot Route**: Add the Entity name to `CacheKeys` in `appsettings.json` of the target microservice (e.g., `[Microservice].API/appsettings.json`) so the API Gateway discovers the routes.
- **Database Migrations**: **NEVER** run migration commands automatically (`dotnet ef migrations add`, `dotnet ef database update`). Generating and applying migrations must be left strictly for the user to execute manually.

## 2. Implementation Workflow

When asked to create a new Backend CRUD endpoint:

1. **Gather Information:**
   - Entity Name (e.g., `Product`).
   - Microservice Name (e.g., `MasterData`).
   - Feature / Folder Name (e.g., `Products`).
   - Excel export/import requirements (determines `BaseExcelController` vs `BaseController`).

2. **Read Scaffolding Templates:** Use `view_file` to inspect the template files in `resources/`, then substitute placeholders (`[EntityName]`, `[Microservice]`, `[FeatureName]`) with concrete values.

3. **Generate Files in Sequential Order (using `write_to_file`):**
   - **Entity Layer:** `backend/src/Services/[Microservice]/[Microservice].Data/Entities/[FeatureName]/[EntityName].cs` (Template: `resources/entity.template.md`)
   - **Configuration Layer:** `backend/src/Services/[Microservice]/[Microservice].Data/Persistence/Configurations/[FeatureName]/[EntityName]Configuration.cs` (Template: `resources/configuration.template.md`)
   - **DTO Layer:** `backend/src/BuildingBlocks/Shared/Dto/[Microservice]/[FeatureName]/[EntityName]Dto.cs` (Template: `resources/dto.template.md`)
   - **Service Interface Layer:** `backend/src/Services/[Microservice]/[Microservice].Services/Interface/[FeatureName]/I[EntityName]Service.cs` (Template: `resources/service-interface.template.md`)
   - **Service Implementation Layer:** `backend/src/Services/[Microservice]/[Microservice].Services/Implement/[FeatureName]/[EntityName]Service.cs` (Template: `resources/service-implement.template.md`)
   - **Controller Layer:** `backend/src/Services/[Microservice]/[Microservice].API/Controllers/[FeatureName]/[EntityName]sController.cs` (Template: `resources/controller.template.md`)

4. **Review & Finalize:**
   - Verify that all `using` statements are valid based on actual namespaces.
   - Register the entity in `appsettings.json` under `"CacheKeys"` (e.g., `"MyEntity": "ME"`).
   - Register DI in `ServiceExtensions.cs` if custom service methods are added.
   - Do NOT run migration commands on behalf of the user.

## 3. Scaffolding Templates

- **Entity**: [resources/entity.template.md](resources/entity.template.md)
- **Configuration**: [resources/configuration.template.md](resources/configuration.template.md)
- **Dto**: [resources/dto.template.md](resources/dto.template.md)
- **Service Interface**: [resources/service-interface.template.md](resources/service-interface.template.md)
- **Service Implementation**: [resources/service-implement.template.md](resources/service-implement.template.md)
- **Controller**: [resources/controller.template.md](resources/controller.template.md)
