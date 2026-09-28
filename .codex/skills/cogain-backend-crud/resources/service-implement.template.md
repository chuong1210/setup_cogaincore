using AutoMapper;
using Contracts.Application.Interfaces;
using Contracts.Domain.Interfaces;
using Contracts.Services;
using Infrastructure.Services;
using [Microservice].Data.Entities.[FeatureName];
using Shared.Dto.[Microservice].[FeatureName];
using [Microservice].Services.Interface.[FeatureName];
using Microsoft.Extensions.Configuration;
using Serilog;
using Shared.Domain.Entities;
using Shared.Dto;

namespace [Microservice].Services.Implement.[FeatureName];

public class [EntityName]Service(
    IMapper mapper,
    IRedisAutoIncrementGenerator codeGen,
    IConfiguration configuration,
    IUnitOfWork unitOfWork,
    AutoFilterService autoFilterService,
    ILogger logger,
    ICurrentUserService currentUserService,
    IFileService fileService)
    : BaseService<[EntityName], [EntityName]Dto, Create[EntityName]Dto, Update[EntityName]Dto, DropdownDto<Guid>, AutoFilter, [EntityName]FilterPaging>(
        mapper, codeGen, configuration, unitOfWork, autoFilterService, logger, currentUserService, fileService), I[EntityName]Service
{
}
