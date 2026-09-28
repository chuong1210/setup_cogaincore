using [Microservice].Data.Entities.[FeatureName];
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace [Microservice].Data.Persistence.Configurations.[FeatureName];

public class [EntityName]Configuration : IEntityTypeConfiguration<[EntityName]>
{
    public void Configure(EntityTypeBuilder<[EntityName]> builder)
    {
        builder.ToTable("[entity-names]"); // Update this with correct table name
        builder.HasKey(x => x.Id);

        builder.HasIndex(x => x.Code)
               .IsUnique()
               .HasFilter("\"deleted_date\" IS NULL");
    }
}
