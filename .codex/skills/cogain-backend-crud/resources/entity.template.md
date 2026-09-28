using System;
using Contracts.Attributes;
using Contracts.Domains;
using Shared.Enums;

namespace [Microservice].Data.Entities.[FeatureName];

[AutoFilter]
[CodeGeneration("[Entity Description]", EContextScope.[Microservice], typeof([EntityName]))]
public record [EntityName] : EntityAuditBase<Guid>
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public EStatus Status { get; set; } = EStatus.Active;
}
