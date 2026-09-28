using [Microservice].Data.Entities.[FeatureName];
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace [Microservice].Data.Persistence.Configurations.[FeatureName];

public class [IntermediateEntity]Configuration : IEntityTypeConfiguration<[IntermediateEntity]>
{
    public void Configure(EntityTypeBuilder<[IntermediateEntity]> builder)
    {
        builder.ToTable("[table-name]"); // Note: use snake_case
        builder.HasKey(x => x.Id);

        builder.HasOne(x => x.[ParentEntity])
            .WithMany(p => p.[CollectionName])
            .HasForeignKey(x => x.[ParentEntity]Id)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasQueryFilter(x => !x.DeletedDate.HasValue);
    }
}
