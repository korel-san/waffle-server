'use strict';
const _ = require('lodash');
const async = require('async');

const ddfql = require('../ws.ddfql/ddf-datapoints-query-normalizer');
const logger = require('../ws.config/log');
const constants = require('../ws.utils/constants');
const commonService = require('./common.service');
const conceptsService = require('./concepts.service');
const entitiesService = require('./entities.service');
const ddfQueryValidator = require('../ws.ddfql/ddf-query-validator');
const entitiesRepositoryFactory = require('../ws.repository/ddf/entities/entities.repository');
const datapointsRepositoryFactory = require('../ws.repository/ddf/data-points/data-points.repository');

module.exports = {
  collectDatapointsByDdfql
};

function collectDatapointsByDdfql(options, onMatchedDatapoints) {
  console.time('finish matching DataPoints');
  const pipe = {
    select: options.select,
    headers: options.headers,
    domainGids: options.domainGids,
    where: options.where,
    query: options.query,
    sort: options.sort,
    groupBy: options.groupBy,
    datasetName: options.datasetName,
    language: options.language,
    version: options.version
  };

  return async.waterfall([
    async.constant(pipe),
    ddfQueryValidator.validateDdfQueryAsync,
    commonService.findDefaultDatasetAndTransaction,
    getConcepts,
    mapConcepts,
    getEntitiesByDdfql,
    normalizeQueriesToDatapointsByDdfql
  ], (error, result) => {
    console.timeEnd('finish matching DataPoints');

    return onMatchedDatapoints(error, result);
  });
}

function getEntitiesByDdfql(pipe, cb) {
  return async.map(pipe.resolvedDomainsAndSetGids, _getEntitiesByDomainOrSetGid, (err, result) => {
    pipe.entityOriginIdsGroupedByDomain = _.mapValues(result, (value) => _.map(value, constants.ORIGIN_ID));
    pipe.entities = _.flatMap(result);

    return cb(err, pipe);
  });

  function _getEntitiesByDomainOrSetGid(domainGid, mcb) {
    const _pipe = {
      dataset: pipe.dataset,
      version: pipe.version,
      domainGid: domainGid,
      headers: [],
      where: {}
    };

    return entitiesService.getEntities(_pipe, (err, result) => {
      if (err) {
        return mcb(err);
      }
      return mcb(err, result.entities);
    });
  }
}

function normalizeQueriesToDatapointsByDdfql(pipe, cb) {
  console.time('get datapoints');

  if (_.isEmpty(pipe.measures)) {
    const error = 'Measure should present in select property';
    logger.error(error);
    return cb(error, pipe);
  }

  const entitiesRepository = entitiesRepositoryFactory.currentVersion(pipe.dataset._id, pipe.version);
  const normalizedQuery = ddfql.normalizeDatapoints(pipe.query, pipe.concepts);

  return async.mapLimit(normalizedQuery.join, 10, (joinQuery, mcb) => {
    const validateQuery = ddfQueryValidator.validateMongoQuery(joinQuery);

    if(!validateQuery.valid) {
      return cb(validateQuery.log, pipe);
    }

    return entitiesRepository.findEntityPropertiesByQuery(joinQuery, (error, entities) => {
      return mcb(error, _.map(entities, constants.ORIGIN_ID));
    });
  }, (err, substituteJoinLinks) => {
    if (err) {
      return cb(err, pipe);
    }

    const promotedQuery = ddfql.substituteDatapointJoinLinks(normalizedQuery, substituteJoinLinks);
    const subDatapointQuery = promotedQuery.where;
    const validateQuery = ddfQueryValidator.validateMongoQuery(subDatapointQuery);

    if(!validateQuery.valid) {
      return cb(validateQuery.log, pipe);
    }

    return queryDatapointsByDdfql(pipe, subDatapointQuery, (err, pipe) => {
      if (err) {
        return cb(err, pipe);
      }

      console.timeEnd('get datapoints');
      if(err) {
        return cb(err);
      }
      logger.info(`${_.size(pipe.datapoints)} items of datapoints were selected`);

      return cb(null, pipe);
    });
  });
}

function queryDatapointsByDdfql(pipe, subDatapointQuery, cb) {
  return datapointsRepositoryFactory
    .currentVersion(pipe.dataset._id, pipe.version)
    .findByQuery(subDatapointQuery, (error, datapoints) => {
      if (error) {
        return cb(error);
      }

      pipe.datapoints = datapoints;

      return cb(null, pipe);
    });
}

function getConcepts(pipe, cb) {
  const _pipe = {
    dataset: pipe.dataset,
    version: pipe.version,
    header: [],
    where: {}
  };

  return conceptsService.getConcepts(_pipe, (err, result) => {
    pipe.concepts = result.concepts;

    return cb(err, pipe);
  });
}

function mapConcepts(pipe, cb) {
  if (_.isEmpty(pipe.headers)) {
    return cb(`You didn't select any column`);
  }
  const resolvedConceptGids = _.map(pipe.concepts, constants.GID);
  const missingHeaders = _.difference(pipe.select, resolvedConceptGids);
  const missingKeys = _.difference(pipe.domainGids, resolvedConceptGids);

  if (!_.isEmpty(missingHeaders)) {
    return cb(`You choose select column(s) '${_.join(missingHeaders, ', ')}' which aren't present in choosen dataset`);
  }

  if (!_.isEmpty(missingKeys)) {
    return cb(`Your choose key column(s) '${_.join(missingKeys, ', ')}' which aren't present in choosen dataset`);
  }

  pipe.measures = _.filter(pipe.concepts, [constants.CONCEPT_TYPE, constants.CONCEPT_TYPE_MEASURE]);
  pipe.resolvedDomainsAndSetGids = pipe.domainGids;

  return async.setImmediate(() => cb(null, pipe));
}
