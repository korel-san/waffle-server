import * as _ from 'lodash';
import {constants} from '../../ws.utils/constants';
import * as ddfImportUtils from './import-ddf.utils';
import * as conceptsUtils from './concepts.utils';
import { isTimeConceptType } from './concepts.utils';
import * as datapointsUtils from './datapoints.utils';

const JSON_COLUMNS = ['color', 'scales', 'drill_up'];

export {
  mapDdfEntityToWsModel,
  mapDdfConceptsToWsModel,
  mapDdfEntityFoundInDatapointToWsModel,
  mapDdfDataPointToWsModel,
  transformEntityProperties,
  transformConceptProperties
};

function mapDdfEntityToWsModel(entry: any, context: any): any {
    const transformedEntry = transformEntityProperties(entry, context.concepts);
    const gid = transformedEntry[context.entitySet.gid];

    const domainOriginId = _.get(context, 'entityDomain.originId', context.entityDomain);

    const newSource = context.filename ? [context.filename] : [];
    const combinedSources = _.union(context.sources, newSource);

    return {
      gid,
      sources: combinedSources,
      properties: transformedEntry,
      parsedProperties: ddfImportUtils.parseProperties(context.entityDomain, gid, transformedEntry, context.timeConcepts),

      originId: _.get(context, 'originId', null),
      languages: transformTranslations(context.languages, (translation: any) => transformEntityProperties(translation, context.concepts)),

      domain: domainOriginId,
      sets: context.entitySetsOriginIds,

      from: context.version,
      dataset: context.datasetId
    };
}

export interface TimeDimension {
  conceptGid: string;
  timeType: string;
  millis: number;
}

function mapDdfDataPointToWsModel(entry: any, externalContext: any): any {
    let timeDimension: TimeDimension;

    const sortedDimensionConceptGids = conceptsUtils.getSortedDimensionConceptGids(_.keys(externalContext.dimensions), externalContext.concepts);

    const dimensions = _.chain(sortedDimensionConceptGids)
      .reduce((result: any, conceptGid: any) => {
        const entityGid = entry[conceptGid];
        const key = `${entityGid}-${externalContext.concepts[conceptGid].originId}`;
        const entity =
          externalContext.entities.byDomain[key]
          || externalContext.entities.bySet[key]
          || externalContext.entities.byGid[entityGid]
          || externalContext.entities.foundInDatapointsByGid[entityGid];

        if (!_.isEmpty(_.get(entity, 'parsedProperties', false))) {
          timeDimension = {
            conceptGid,
            timeType: _.get(entity, `parsedProperties.${conceptGid}.timeType`, ''),
            millis: _.get(entity, `parsedProperties.${conceptGid}.millis`, 0)
          };
        } else {
          result.push(entity.originId);
        }

        return result;
      }, [])
      .value();

    return _.chain(entry)
      .pick(_.keys(externalContext.measures))
      .map((datapointValue: any, measureGid: any) => {
        const datapointValueAsNumber = ddfImportUtils.toNumeric(datapointValue);
        return {
          value: _.isNil(datapointValueAsNumber) ? datapointValue : datapointValueAsNumber,
          measure: externalContext.measures[measureGid].originId,
          dimensions,
          dimensionsConcepts: externalContext.dimensionsConcepts,

          properties: entry,
          originId: entry.originId,
          languages: _.get(externalContext, 'languages', {}),

          time: timeDimension,

          isNumeric: !_.isNil(datapointValueAsNumber),
          from: externalContext.version,
          to: constants.MAX_VERSION,
          dataset: externalContext.datasetId,
          sources: [externalContext.filename]
        };
      })
      .value();
}

function mapDdfEntityFoundInDatapointToWsModel(datapoint: any, context: any): any {
  const gid = datapoint[context.concept.gid];
  return {
    gid: String(gid),
    sources: [context.filename],
    properties: datapoint,
    parsedProperties: ddfImportUtils.parseProperties(context.concept, gid, datapoint, context.timeConcepts),

    domain: context.domain.originId,
    sets: context.concept.type === constants.CONCEPT_TYPE_ENTITY_SET ? [context.concept.originId] : [],
    drillups: [],

    from: context.version,
    dataset: context.datasetId
  };
}

function mapDdfConceptsToWsModel(entry: any, context: any): void {
  const transformedEntry = transformConceptProperties(entry);

  const concept: any = {
    gid: transformedEntry.concept,

    title: transformedEntry.name || transformedEntry.title,
    type: conceptsUtils.isTimeConceptType(transformedEntry.concept_type) ? constants.CONCEPT_TYPE_ENTITY_DOMAIN : transformedEntry.concept_type,

    properties: transformedEntry,

    domain: _.get(context, 'domain', null),

    languages: transformTranslations(context.languages, transformConceptProperties),

    subsetOf: [],

    from: context.version,
    to: constants.MAX_VERSION,
    dataset: context.datasetId,
    originId: _.get(context, 'originId', null)
  };

  if (context.filename) {
    concept.sources = [context.filename];
  }

  return concept;
}

function transformTranslations(translationsByLang: any, transform: any): any {
  return _.reduce(translationsByLang, (result: any, translation: any, lang: string) => {
    result[lang] = transform(translation);
    return result;
  }, {});
}

function transformEntityProperties(object: any, concepts: any): any {
  return _.transform(object, (result: any, value: any, key: any) => {
    const ddfBool = ddfImportUtils.toBoolean(value);
    if (!_.isNil(ddfBool)) {
      result[key] = ddfBool;
      return;
    }

    const concept = concepts[key];
    if (concept && concept.type === 'measure') {
      const ddfNumeric = ddfImportUtils.toNumeric(value);
      if (!_.isNil(ddfNumeric)) {
        result[key] = ddfNumeric;
        return;
      }
    }

    result[key] = String(value);
  }, {});
}

function transformConceptProperties(object: Object): any {
  return _.transform(object, (result: any, value: any, key: any) => {
    if (_.isNil(value) || value === '') {
      result[key] = null;
    } else if (isJsonColumn(key) && _.isString(value)) {
      result[key] = ddfImportUtils.isJson(value) ? JSON.parse(value) : null;
    } else if (_.isObjectLike(value)) {
      result[key] = value;
    } else {
      result[key] = String(value);
    }
  }, {});
}

function isJsonColumn(column: any): boolean {
  return _.includes(JSON_COLUMNS, column);
}
