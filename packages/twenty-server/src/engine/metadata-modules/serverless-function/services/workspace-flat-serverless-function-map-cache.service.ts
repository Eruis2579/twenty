import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { WorkspaceCacheProvider } from 'src/engine/workspace-cache/interfaces/workspace-cache-provider.service';

import { ApplicationEntity } from 'src/engine/core-modules/application/application.entity';
import { CronTriggerEntity } from 'src/engine/metadata-modules/cron-trigger/entities/cron-trigger.entity';
import { DatabaseEventTriggerEntity } from 'src/engine/metadata-modules/database-event-trigger/entities/database-event-trigger.entity';
import { createEmptyFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-flat-entity-maps.constant';
import { FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { RouteTriggerEntity } from 'src/engine/metadata-modules/route-trigger/route-trigger.entity';
import { ServerlessFunctionEntity } from 'src/engine/metadata-modules/serverless-function/serverless-function.entity';
import { FlatServerlessFunction } from 'src/engine/metadata-modules/serverless-function/types/flat-serverless-function.type';
import { fromServerlessFunctionEntityToFlatServerlessFunction } from 'src/engine/metadata-modules/serverless-function/utils/from-serverless-function-entity-to-flat-serverless-function.util';
import { WorkspaceCache } from 'src/engine/workspace-cache/decorators/workspace-cache.decorator';
import { createIdToUniversalIdentifierMap } from 'src/engine/workspace-cache/utils/create-id-to-universal-identifier-map.util';
import { regroupEntitiesByRelatedEntityId } from 'src/engine/workspace-cache/utils/regroup-entities-by-related-entity-id';
import { addFlatEntityToFlatEntityMapsThroughMutationOrThrow } from 'src/engine/workspace-manager/workspace-migration/utils/add-flat-entity-to-flat-entity-maps-through-mutation-or-throw.util';

@Injectable()
@WorkspaceCache('flatServerlessFunctionMaps')
export class WorkspaceFlatServerlessFunctionMapCacheService extends WorkspaceCacheProvider<
  FlatEntityMaps<FlatServerlessFunction>
> {
  constructor(
    @InjectRepository(ServerlessFunctionEntity)
    private readonly serverlessFunctionRepository: Repository<ServerlessFunctionEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
    @InjectRepository(DatabaseEventTriggerEntity)
    private readonly databaseEventTriggerRepository: Repository<DatabaseEventTriggerEntity>,
    @InjectRepository(CronTriggerEntity)
    private readonly cronTriggerRepository: Repository<CronTriggerEntity>,
    @InjectRepository(RouteTriggerEntity)
    private readonly routeTriggerRepository: Repository<RouteTriggerEntity>,
  ) {
    super();
  }

  async computeForCache(
    workspaceId: string,
  ): Promise<FlatEntityMaps<FlatServerlessFunction>> {
    const [
      serverlessFunctions,
      applications,
      cronTriggers,
      routeTriggers,
      databaseEventTriggers,
    ] = await Promise.all([
      this.serverlessFunctionRepository.find({
        where: { workspaceId },
        withDeleted: true,
      }),
      this.applicationRepository.find({
        where: { workspaceId },
        select: ['id', 'universalIdentifier'],
        withDeleted: true,
      }),
      this.cronTriggerRepository.find({
        where: { workspaceId },
        select: ['id', 'universalIdentifier', 'serverlessFunctionId'],
        withDeleted: true,
      }),
      this.routeTriggerRepository.find({
        where: { workspaceId },
        select: ['id', 'universalIdentifier', 'serverlessFunctionId'],
        withDeleted: true,
      }),
      this.databaseEventTriggerRepository.find({
        where: { workspaceId },
        select: ['id', 'universalIdentifier', 'serverlessFunctionId'],
        withDeleted: true,
      }),
    ]);

    const [
      cronTriggersByServerlessFunctionId,
      routeTriggersByServerlessFunctionId,
      databaseEventTriggersByServerlessFunctionId,
    ] = (
      [
        {
          entities: cronTriggers,
          foreignKey: 'serverlessFunctionId',
        },
        {
          entities: routeTriggers,
          foreignKey: 'serverlessFunctionId',
        },
        {
          entities: databaseEventTriggers,
          foreignKey: 'serverlessFunctionId',
        },
      ] as const
    ).map(regroupEntitiesByRelatedEntityId);

    const applicationIdToUniversalIdentifierMap =
      createIdToUniversalIdentifierMap(applications);

    const flatServerlessFunctionMaps = createEmptyFlatEntityMaps();

    for (const serverlessFunctionEntity of serverlessFunctions) {
      const flatServerlessFunction =
        fromServerlessFunctionEntityToFlatServerlessFunction({
          serverlessFunctionEntity: {
            ...serverlessFunctionEntity,
            cronTriggers:
              cronTriggersByServerlessFunctionId.get(
                serverlessFunctionEntity.id,
              ) || [],
            routeTriggers:
              routeTriggersByServerlessFunctionId.get(
                serverlessFunctionEntity.id,
              ) || [],
            databaseEventTriggers:
              databaseEventTriggersByServerlessFunctionId.get(
                serverlessFunctionEntity.id,
              ) || [],
          },
          applicationIdToUniversalIdentifierMap,
        });

      addFlatEntityToFlatEntityMapsThroughMutationOrThrow({
        flatEntity: flatServerlessFunction,
        flatEntityMapsToMutate: flatServerlessFunctionMaps,
      });
    }

    return flatServerlessFunctionMaps;
  }
}
