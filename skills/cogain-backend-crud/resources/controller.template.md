using Infrastructure.Controllers;
using [Microservice].Data.Entities.[FeatureName];
using Shared.Dto.[Microservice].[FeatureName];
using [Microservice].Services.Interface.[FeatureName];
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Shared.Domain.Entities;
using Shared.Dto;
using System;

namespace [Microservice].API.Controllers.[FeatureName];

[Authorize]
public class [EntityName]sController : BaseController<I[EntityName]Service, [EntityName], [EntityName]Dto, Create[EntityName]Dto, Update[EntityName]Dto, DropdownDto<Guid>, AutoFilter, [EntityName]FilterPaging>
{
    public [EntityName]sController(I[EntityName]Service service) : base(service)
    {
    }
}
