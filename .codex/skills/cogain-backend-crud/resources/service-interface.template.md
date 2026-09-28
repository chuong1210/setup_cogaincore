using System;
using Contracts.Attributes;
using Contracts.Domains;
using Infrastructure.Services;
using [Microservice].Data.Entities.[FeatureName];
using Shared.Dto.[Microservice].[FeatureName];
using Shared.Domain.Entities;
using Shared.Dto;
using Contracts.Application.Interfaces;

namespace [Microservice].Services.Interface.[FeatureName];

public interface I[EntityName]Service : IBaseService<[EntityName], [EntityName]Dto, Create[EntityName]Dto, Update[EntityName]Dto, DropdownDto<Guid>, AutoFilter, [EntityName]FilterPaging>
{
}
