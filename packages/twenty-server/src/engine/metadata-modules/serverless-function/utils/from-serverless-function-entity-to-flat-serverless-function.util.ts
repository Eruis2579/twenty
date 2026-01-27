import { isDefined, removePropertiesFromRecord } from 'twenty-shared/utils';

import {
  FlatEntityMapsException,
  FlatEntityMapsExceptionCode,
} from 'src/engine/metadata-modules/flat-entity/exceptions/flat-entity-maps.exception';
import { type ServerlessFunctionEntity } from 'src/engine/metadata-modules/serverless-function/serverless-function.entity';
import { type FlatServerlessFunction } from 'src/engine/metadata-modules/serverless-function/types/flat-serverless-function.type';
import { type EntityWithRegroupedOneToManyRelations } from 'src/engine/workspace-cache/types/entity-with-regrouped-one-to-many-relations.type';

export const fromServerlessFunctionEntityToFlatServerlessFunction = ({
  serverlessFunctionEntity,
  applicationIdToUniversalIdentifierMap,
}: {
  serverlessFunctionEntity: EntityWithRegroupedOneToManyRelations<ServerlessFunctionEntity>;
  applicationIdToUniversalIdentifierMap: Map<string, string>;
}): FlatServerlessFunction => {
  const serverlessFunctionWithoutRelations = removePropertiesFromRecord(
    serverlessFunctionEntity,
    [
      'databaseEventTriggers',
      'routeTriggers',
      'cronTriggers',
      'serverlessFunctionLayer',
      'application',
    ],
  );

  const applicationUniversalIdentifier =
    applicationIdToUniversalIdentifierMap.get(
      serverlessFunctionEntity.applicationId,
    );

  if (!isDefined(applicationUniversalIdentifier)) {
    throw new FlatEntityMapsException(
      `Application with id ${serverlessFunctionEntity.applicationId} not found for serverlessFunction ${serverlessFunctionEntity.id}`,
      FlatEntityMapsExceptionCode.ENTITY_NOT_FOUND,
    );
  }

  return {
    ...serverlessFunctionWithoutRelations,
    createdAt: serverlessFunctionEntity.createdAt.toISOString(),
    updatedAt: serverlessFunctionEntity.updatedAt.toISOString(),
    deletedAt: serverlessFunctionEntity.deletedAt?.toISOString() ?? null,
    cronTriggerIds:
      serverlessFunctionEntity.cronTriggers.map(({ id }) => id) ?? [],
    routeTriggerIds:
      serverlessFunctionEntity.routeTriggers.map(({ id }) => id) ?? [],
    databaseEventTriggerIds:
      serverlessFunctionEntity.databaseEventTriggers.map(({ id }) => id) ?? [],
    universalIdentifier: serverlessFunctionEntity.universalIdentifier,
    __universal: {
      universalIdentifier: serverlessFunctionEntity.universalIdentifier,
      applicationUniversalIdentifier,
      cronTriggerUniversalIdentifiers:
        serverlessFunctionEntity.cronTriggers.map(
          ({ universalIdentifier }) => universalIdentifier,
        ) ?? [],
      routeTriggerUniversalIdentifiers:
        serverlessFunctionEntity.routeTriggers.map(
          ({ universalIdentifier }) => universalIdentifier,
        ) ?? [],
      databaseEventTriggerUniversalIdentifiers:
        serverlessFunctionEntity.databaseEventTriggers.map(
          ({ universalIdentifier }) => universalIdentifier,
        ) ?? [],
      publishedVersions: serverlessFunctionWithoutRelations.publishedVersions,
      toolInputSchema: serverlessFunctionWithoutRelations.toolInputSchema,
    },
  };
};
