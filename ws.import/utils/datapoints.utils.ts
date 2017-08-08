import * as _ from 'lodash';
import * as hi from 'highland';

import {MongooseDocument} from 'mongoose';
import {logger} from '../../ws.config/log';
import * as ddfMappers from './ddf-mappers';
import * as ddfImportUtils from './import-ddf.utils';
import {EntitiesRepositoryFactory} from '../../ws.repository/ddf/entities/entities.repository';
import {DatapointsRepositoryFactory} from '../../ws.repository/ddf/data-points/data-points.repository';
import * as conceptsUtils from './concepts.utils';
import {constants} from '../../ws.utils/constants';

export interface TimeDimensionQuery {
  'time.conceptGid': string;
  'time.timeType': string;
  'time.millis': number;
}

export {
  getDimensionsAndMeasures,
  segregateEntities,
  findEntitiesInDatapoint,
  findAllEntities,
  findAllPreviousEntities,
  createEntitiesFoundInDatapointsSaverWithCache,
  saveDatapointsAndEntitiesFoundInThem,
  getDimensionsAsEntityOriginIds
};

function saveDatapointsAndEntitiesFoundInThem(saveEntitiesFoundInDatapoints: any, externalContextFrozen: any, datapointsFoundEntitiesStream: any): any {
  return datapointsFoundEntitiesStream
    .compact()
    .batch(ddfImportUtils.DEFAULT_CHUNK_SIZE)
    .flatMap((datapointsBatch: any) => {
      const datapointsByFilename = groupDatapointsByFilename(datapointsBatch);
      const entitiesFoundInDatapoints = _.flatten(_.map(datapointsBatch, 'entitiesFoundInDatapoint'));

      return hi(
        saveEntitiesFoundInDatapoints(entitiesFoundInDatapoints)
          .then(saveDatapoints(datapointsByFilename, externalContextFrozen))
      );
    });
}

function groupDatapointsByFilename(datapointsBatch: any): any {
  return _.chain(datapointsBatch)
    .groupBy('context.filename')
    .mapValues((datapoints: any[], filename: any) => {
      const anyDatapoint = _.head(datapoints);
      const dimensions = _.get(anyDatapoint, 'context.dimensions', {});

      return {
        filename,
        datapoints,
        context: anyDatapoint.context,
        measures: _.get(anyDatapoint, 'context.measures'),
        dimensions,
        dimensionsConcepts: flattenDimensions(dimensions)
      };
    })
    .value();
}

function flattenDimensions(dimensions: any): any[] {
  const flatDimensionsSet = _.reduce(dimensions, (result: any, dimension: any) => {
    const domain = _.get(dimension, 'domain');
    if (domain) {
      const domainOriginId = _.get(domain, 'originId', domain);
      result.set(_.toString(domainOriginId), domainOriginId);
    }
    result.set(_.toString(dimension.originId), dimension.originId);
    return result;
  }, new Map());

  return Array.from(flatDimensionsSet.values());
}

function saveDatapoints(datapointsByFilename: any, externalContextFrozen: any): any {
  return (entitiesFoundInDatapointsByGid: any) => {
    return Promise.all(_.map(datapointsByFilename, (datapointsFromSameFile: any) => {
      datapointsFromSameFile.context.segregatedEntities.foundInDatapointsByGid = entitiesFoundInDatapointsByGid;
      return mapAndStoreDatapointsToDb(datapointsFromSameFile, externalContextFrozen);
    }));
  };
}

function mapAndStoreDatapointsToDb(datapointsFromSameFile: any, externalContext: any): any {
  const {measures, filename, dimensions, dimensionsConcepts, context: {segregatedEntities: entities}} = datapointsFromSameFile;

  const {dataset: {_id: datasetId}, transaction: {createdAt: version}, concepts} = externalContext;

  const mappingContext = {
    measures,
    filename,
    dimensions,
    dimensionsConcepts,
    entities,
    datasetId,
    version,
    concepts
  };

  const wsDatapoints = _.flatMap(datapointsFromSameFile.datapoints, (datapointWithContext: any) => {
    return ddfMappers.mapDdfDataPointToWsModel(datapointWithContext.datapoint, mappingContext);
  });

  logger.debug('Store datapoints to database. Amount: ', _.size(wsDatapoints));
  return DatapointsRepositoryFactory.versionAgnostic().create(wsDatapoints);
}

function findAllEntities(externalContext: any): any {
  const {dataset: {_id: datasetId}, transaction: {createdAt: version}} = externalContext;

  return EntitiesRepositoryFactory
    .latestVersion(datasetId, version)
    .findAll()
    .then(segregateEntities);
}

function findAllPreviousEntities(externalContext: any): Promise<Object> {
  const {dataset: {_id: datasetId}, previousTransaction: {createdAt: version}} = externalContext;

  return EntitiesRepositoryFactory
    .currentVersion(datasetId, version)
    .findAll()
    .then(segregateEntities);
}

function getDimensionsAndMeasures(resource: any, externalContext: any): any {
  logger.debug('Processing resource with path: ', resource.path);
  const measures = _.merge(
    _.pick(externalContext.previousConcepts, resource.indicators),
    _.pick(externalContext.concepts, resource.indicators)
  );

  const dimensions = _.merge(
    _.pick(externalContext.previousConcepts, resource.dimensions),
    _.pick(externalContext.concepts, resource.dimensions)
  );

  if (_.isEmpty(measures)) {
    throw Error(`Measures were not found for indicators: ${resource.indicators} from resource ${resource.path}`);
  }

  if (_.isEmpty(dimensions)) {
    throw Error(`Dimensions were not found for dimensions: ${resource.dimensions} from resource ${resource.path}`);
  }

  return { measures, dimensions };
}

function getDimensionsAsEntityOriginIds(datapoint: any, externalContext: any): any {
  let timeDimension: TimeDimensionQuery;
  const timeConcept: any = _.find(externalContext.timeConcepts, (_timeConcept: any) => _.has(datapoint, _timeConcept.gid));
  const dimensions = _.chain(externalContext.dimensions)
    .omit(_.keys(externalContext.timeConcepts))
    .keys()
    .value();

  if (timeConcept) {
    const timeEntityGid = datapoint[timeConcept.gid];
    const timeEntity = _.first(externalContext.segregatedEntities.groupedByGid[timeEntityGid] || externalContext.segregatedPreviousEntities.groupedByGid[timeEntityGid]);
    timeDimension = {
      'time.conceptGid': timeConcept.gid,
      'time.timeType': _.get(timeEntity, `parsedProperties.${timeConcept.gid}.timeType`, ''),
      'time.millis': _.get(timeEntity, `parsedProperties.${timeConcept.gid}.millis`, 0)
    };
  }

  const result = {dimensionsEntityOriginIds: [], timeDimension};

  _.chain(datapoint)
    .pickBy((entityGid: string, conceptGid: string) => _.includes(dimensions, conceptGid) && !!entityGid)
    .reduce((_result: any, entityGid: string, conceptGid: string) => {
      const concept = externalContext.dimensions[conceptGid];
      const entities = externalContext.segregatedEntities.groupedByGid[entityGid] || externalContext.segregatedPreviousEntities.groupedByGid[entityGid];
      const matchedEntities = _.chain(entities).filter((entity: any) => {
        const isDomain = concept.type === constants.CONCEPT_TYPE_ENTITY_DOMAIN;
        const isSet = concept.type === constants.CONCEPT_TYPE_ENTITY_SET;

        if (isDomain && _.isEqual(entity.domain, concept.originId) && _.isEmpty(entity.sets)) {
          return true;
        }

        if (isSet && _.isEqual(entity.domain, concept.domain.originId) && _.includes(entity.sets, concept.originId)) {
          return true;
        }

        return false;
      }).map('originId').value();

      _result.dimensionsEntityOriginIds.push(...matchedEntities);

      return _result;
    }, result)
    .value();

  return result;
}

function segregateEntities(entities: any): any {
  // FIXME: Segregation is a workaround for issue related to having same gid in couple entity files
  return _.reduce(entities, (result: any, entity: any, conceptGid) => {
    if (_.isEmpty(entity.sets)) {
      const domain = entity.domain;
      result.byDomain[`${entity.gid}-${_.get(domain, 'originId', domain)}`] = entity;
    } else {
      const set = _.head(entity.sets);
      result.bySet[`${entity.gid}-${_.get(set, 'originId', set)}`] = entity;
    }

    result.byGid[entity.gid] = entity;

    result.groupedByGid[entity.gid] = result.groupedByGid[entity.gid] || [];
    result.groupedByGid[entity.gid].push(entity);
    return result;
  }, {bySet: {}, byDomain: {}, byGid: {}, groupedByGid: {}});
}

function findEntitiesInDatapoint(datapoint: any, context: any, externalContext: any): any[] {
  const alreadyFoundEntityGids = new Set();

  const {transaction: {createdAt: version}, dataset: {_id: datasetId}, timeConcepts} = externalContext;

  return _.reduce(context.dimensions, (entitiesFoundInDatapoint: any, concept: any, conceptGid: string) => {
    const domain = concept.domain || concept;
    const entityGid = datapoint[conceptGid];
    const existedEntities: any[] = context.segregatedEntities.byGid[entityGid];
    const alreadyFoundEntity = alreadyFoundEntityGids.has(entityGid);

    if (_.isEmpty(existedEntities) && !alreadyFoundEntity) {

      const entityFoundInDatapoint = ddfMappers.mapDdfEntityFoundInDatapointToWsModel(datapoint, {
        version,
        datasetId,
        timeConcepts,
        domain,
        concept,
        filename: context.filename
      });

      alreadyFoundEntityGids.add(entityFoundInDatapoint.gid);
      entitiesFoundInDatapoint.push(entityFoundInDatapoint);
    }

    return entitiesFoundInDatapoint;
  }, []);
}

function createEntitiesFoundInDatapointsSaverWithCache(): any {
  const entitiesFoundInDatapointsCache = {};
  return (entities: any) => {
    const notSeenEntities = _.reduce(entities, (result: any, entity: any) => {
      if (!entitiesFoundInDatapointsCache[entity.gid]) {
        entitiesFoundInDatapointsCache[entity.gid] = entity;
        result.push(entity);
      }
      return result;
    }, []);

    if (_.isEmpty(notSeenEntities)) {
      return Promise.resolve(entitiesFoundInDatapointsCache);
    }

    return storeEntitiesToDb(notSeenEntities)
      .then((entityModels: any) => {
        return _.reduce(entityModels, (cache: any, model: MongooseDocument) => {
          const entity: any = model.toObject();
          cache[entity.gid] = entity;
          return cache;
        }, entitiesFoundInDatapointsCache);
      });
  };
}

function storeEntitiesToDb(entities: any): any {
  logger.debug(`Store entities found in datapoints to database. Amount: `, _.size(entities));
  return EntitiesRepositoryFactory.versionAgnostic().create(entities);
}
