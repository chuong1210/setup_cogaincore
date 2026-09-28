using System;
using Shared.Domain.Entities;
using Shared.Enums;

namespace Shared.Dto.[Microservice].[FeatureName];

public record [EntityName]Dto : EntityBaseDto<Guid>
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public EStatus Status { get; set; }
}

public abstract record CreateAndUpdate[EntityName]Dto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public record Create[EntityName]Dto : CreateAndUpdate[EntityName]Dto
{
    public EStatus Status { get; set; } = EStatus.Active;
}

public record Update[EntityName]Dto : CreateAndUpdate[EntityName]Dto
{
    public EStatus Status { get; set; } = EStatus.Active;
}

public record [EntityName]FilterPaging : AutoFilterPaging
{
}
