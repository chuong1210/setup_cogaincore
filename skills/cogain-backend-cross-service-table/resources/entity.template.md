using Contracts.Attributes;
using Contracts.Domains;
using System;

namespace [Microservice].Data.Entities.[FeatureName];

[AutoFilter]
public record [IntermediateEntity] : EntityAuditBase<Guid>
{
    public Guid [ParentEntity]Id { get; set; }
    public Guid [ChildEntity]Id { get; set; }
    public string [ChildEntity]CodeSnapshot { get; set; } = string.Empty;
    public string [ChildEntity]NameSnapshot { get; set; } = string.Empty;
    
    // TODO: Add supplementary fields here as required by the user
    
    public virtual [ParentEntity] [ParentEntity] { get; set; } = null!;
}
