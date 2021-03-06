import '../../ws.repository';

import * as hi from 'highland';
import * as fs from 'fs';
import * as sinon from 'sinon';
import { expect } from 'chai';

import { createTranslations } from '../../ws.import/import-translations';
import { constants } from '../../ws.utils/constants';
import { logger } from '../../ws.config/log';
import * as fileUtils from '../../ws.utils/file';
import * as ddfMappers from '../../ws.import/utils/ddf-mappers';
import * as ddfImportUtils from '../../ws.import/utils/import-ddf.utils';

import { ConceptsRepositoryFactory } from '../../ws.repository/ddf/concepts/concepts.repository';
import { EntitiesRepositoryFactory } from '../../ws.repository/ddf/entities/entities.repository';
import { DatapointsRepositoryFactory } from '../../ws.repository/ddf/data-points/data-points.repository';

const sandbox = sinon.createSandbox();

const language = {
  id: 'nl-nl',
  name: 'nl-nl'
};

const datapackageStub: any = {
  name: 'ddf--ws-testing',
  title: 'ddf--ws-testing',
  description: '',
  version: '0.0.1',
  language: {
    id: 'en',
    name: 'English'
  },
  translations: [language],
  license: '',
  author: ''
};

const context = {
  pathToDdfFolder: '/some/path',
  datapackage: datapackageStub,
  concepts: {
    company_scale: {
      type: constants.CONCEPT_TYPE_ENTITY_SET
    }
  },
  transaction: {
    _id: 'txId',
    createdAt: 1111111
  },
  dataset: {
    _id: 'datasetId'
  }
};

describe('Import translations', () => {
  describe('Import concepts translations', () => {
    const conceptTranslation = {
      concept: 'english_speaking',
      concept_type: 'entity_set',
      domain: 'company',
      additional_column: 'Engels sprekende'
    };

    before(() => {
      datapackageStub.resources = [{
        type: constants.CONCEPTS,
        primaryKey: ['concept'],
        path: 'ddf--concepts.csv'
      }];
    });

    after(() => {
      datapackageStub.resources = [];
    });

    afterEach(() => sandbox.restore());

    it('should import translations for concept', (done: Function) => {
      const addTranslationsForGivenPropertiesSpy = sandbox.stub().returns(Promise.resolve());
      const allOpenedInGivenVersionStub = sandbox.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns({ addTranslationsForGivenProperties: addTranslationsForGivenPropertiesSpy });

      const fsAccessStub = sandbox.stub(fs, 'access').callsArgWithAsync(2);

      const readCsvFileAsStreamStub = sandbox.stub(fileUtils, 'readCsvFileAsStream').returns(hi([conceptTranslation]));
      sandbox.stub(logger, 'info');

      createTranslations(context, (errors, externalContext) => {
        expect(errors).to.not.exist;
        expect(externalContext).to.equal(context);

        sinon.assert.calledOnce(fsAccessStub);
        sinon.assert.calledWith(fsAccessStub, '/some/path/lang/nl-nl/ddf--concepts.csv', fs.constants.R_OK);
        sinon.assert.calledOnce(fsAccessStub);

        sinon.assert.calledOnce(readCsvFileAsStreamStub);
        sinon.assert.calledWith(readCsvFileAsStreamStub, '/some/path', 'lang/nl-nl/ddf--concepts.csv');

        sinon.assert.calledOnce(allOpenedInGivenVersionStub);
        sinon.assert.calledWith(allOpenedInGivenVersionStub, context.dataset._id, context.transaction.createdAt);

        sinon.assert.calledOnce(addTranslationsForGivenPropertiesSpy);
        sinon.assert.calledWith(addTranslationsForGivenPropertiesSpy, conceptTranslation, {
          language: {
            id: 'nl-nl',
            name: 'nl-nl'
          }
        });

        done();
      });
    });

    it('should import translations for concept: translation properties are transformed by ddf mapper', (done: Function) => {
      const transformedTranslation = { hello: 'world' };
      const transformConceptPropertiesStub = sandbox.stub(ddfMappers, 'transformConceptProperties').returns(transformedTranslation);

      const addTranslationsForGivenPropertiesSpy = sandbox.stub().returns(Promise.resolve());
      sandbox.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns({ addTranslationsForGivenProperties: addTranslationsForGivenPropertiesSpy });

      sandbox.stub(fs, 'access').callsArgWithAsync(2);

      sandbox.stub(fileUtils, 'readCsvFileAsStream').returns(hi([conceptTranslation]));
      sandbox.stub(logger, 'info');

      createTranslations(context, (errors, externalContext) => {
        expect(errors).to.not.exist;
        expect(externalContext).to.equal(context);

        sinon.assert.calledOnce(transformConceptPropertiesStub);
        sinon.assert.calledWith(transformConceptPropertiesStub, conceptTranslation);

        sinon.assert.calledOnce(addTranslationsForGivenPropertiesSpy);
        sinon.assert.calledWith(addTranslationsForGivenPropertiesSpy, transformedTranslation);

        done();
      });
    });

    it('should not import translations for concept if it is impossible to read a file with them', (done: Function) => {
      const addTranslationsForGivenPropertiesSpy = sandbox.stub().returns(Promise.resolve());
      const allOpenedInGivenVersionStub = sandbox.stub(ConceptsRepositoryFactory, 'allOpenedInGivenVersion').returns({ addTranslationsForGivenProperties: addTranslationsForGivenPropertiesSpy });

      const fsAccessStub = sandbox.stub(fs, 'access').callsArgWithAsync(2, 'Cannot Read File');

      const readCsvFileAsStreamStub = sandbox.stub(fileUtils, 'readCsvFileAsStream').returns(hi([conceptTranslation]));
      sandbox.stub(logger, 'info');

      createTranslations(context, (errors, externalContext) => {
        expect(errors).to.not.exist;
        expect(externalContext).to.equal(context);

        sinon.assert.calledOnce(fsAccessStub);
        sinon.assert.calledWith(fsAccessStub, '/some/path/lang/nl-nl/ddf--concepts.csv', fs.constants.R_OK);
        sinon.assert.calledOnce(fsAccessStub);

        sinon.assert.notCalled(readCsvFileAsStreamStub);
        sinon.assert.notCalled(allOpenedInGivenVersionStub);
        sinon.assert.notCalled(addTranslationsForGivenPropertiesSpy);

        done();
      });
    });
  });

  describe('Import entities translations', () => {
    const entityResource = {
      type: constants.ENTITIES,
      path: 'ddf--entities--company--company_scale.csv',
      fields: [
        {
          name: 'company_scale'
        },
        {
          name: 'full_name_changed'
        },
        {
          name: 'is--company_scale'
        }
      ],
      concept: 'company_scale',
      entitySets: ['company_scale'],
      primaryKey: ['company_scale']
    };

    const entityTranslation = {
      company_scale: 'large',
      full_name_changed: 'HEEL GROOT!!!$(#(*#*($',
      'is--company_scale': 'TRUE'
    };

    before(() => {
      datapackageStub.resources = [entityResource];
    });

    after(() => {
      datapackageStub.resources = [];
    });

    afterEach(() => sandbox.restore());


    it('should import translations for entity', (done: Function) => {
      const loggerStub = sandbox.stub(logger, 'info');
      const addTranslationsForGivenPropertiesSpy = sandbox.stub().returns(Promise.resolve());
      const allOpenedInGivenVersionStub = sandbox.stub(EntitiesRepositoryFactory, 'allOpenedInGivenVersion').returns({ addTranslationsForGivenProperties: addTranslationsForGivenPropertiesSpy });

      const fsAccessStub = sandbox.stub(fs, 'access').callsArgWithAsync(2);

      const readCsvFileAsStreamStub = sandbox.stub(fileUtils, 'readCsvFileAsStream').returns(hi([entityTranslation]));

      const toBooleanSpy = sandbox.spy(ddfImportUtils, 'toBoolean');

      createTranslations(context, (errors: null, externalContext: any) => {
        expect(errors).to.not.exist;
        expect(externalContext).to.equal(context);

        const expectedEntityTranslation = {
          company_scale: 'large',
          full_name_changed: 'HEEL GROOT!!!$(#(*#*($',
          'is--company_scale': true
        };

        sinon.assert.callCount(toBooleanSpy, 2);

        sinon.assert.calledOnce(loggerStub);

        sinon.assert.calledOnce(fsAccessStub);
        sinon.assert.calledWith(fsAccessStub, '/some/path/lang/nl-nl/ddf--entities--company--company_scale.csv', fs.constants.R_OK);

        sinon.assert.calledOnce(readCsvFileAsStreamStub);
        sinon.assert.calledWith(readCsvFileAsStreamStub, '/some/path', 'lang/nl-nl/ddf--entities--company--company_scale.csv');

        sinon.assert.calledOnce(allOpenedInGivenVersionStub);
        sinon.assert.calledWith(allOpenedInGivenVersionStub, context.dataset._id, context.transaction.createdAt);

        sinon.assert.calledOnce(addTranslationsForGivenPropertiesSpy);
        sinon.assert.calledWith(addTranslationsForGivenPropertiesSpy, expectedEntityTranslation, {
          language,
          source: entityResource.path,
          resolvedProperties: { gid: 'large', 'properties.is--company_scale': true }
        });

        done();
      });
    });

    it('should not import translations for entity if it is impossible to read a file with them', (done: Function) => {
      const addTranslationsForGivenPropertiesSpy = sandbox.stub().returns(Promise.resolve());
      const allOpenedInGivenVersionStub = sandbox.stub(EntitiesRepositoryFactory, 'allOpenedInGivenVersion').returns({ addTranslationsForGivenProperties: addTranslationsForGivenPropertiesSpy });

      const fsAccessStub = sandbox.stub(fs, 'access').callsArgWithAsync(2, 'Cannot Read File');

      const readCsvFileAsStreamStub = sandbox.stub(fileUtils, 'readCsvFileAsStream').returns(hi([entityTranslation]));
      sandbox.stub(logger, 'info');

      createTranslations(context, (errors, externalContext) => {
        expect(errors).to.not.exist;
        expect(externalContext).to.equal(context);

        sinon.assert.calledOnce(fsAccessStub);
        sinon.assert.calledWith(fsAccessStub, '/some/path/lang/nl-nl/ddf--entities--company--company_scale.csv', fs.constants.R_OK);
        sinon.assert.calledOnce(fsAccessStub);

        sinon.assert.notCalled(readCsvFileAsStreamStub);
        sinon.assert.notCalled(allOpenedInGivenVersionStub);
        sinon.assert.notCalled(addTranslationsForGivenPropertiesSpy);

        done();
      });
    });
  });

  describe('Import datapoints translations', () => {
    const datapointResource = {
      type: constants.DATAPOINTS,
      path: 'ddf--datapoints--company_scale--by--company--anno.csv',
      indicators: [
        'company_scale'
      ],
      dimensions: [
        'company',
        'anno'
      ],
      primaryKey: [
        'company',
        'anno'
      ]
    };

    const datapointTranslation = {
      company: 'mcrsft',
      anno: 1975,
      company_scale: 'klein'
    };

    before(() => {
      datapackageStub.resources = [datapointResource];
    });

    after(() => {
      datapackageStub.resources = [];
    });

    afterEach(() => sandbox.restore());


    it('should import translations for datapoint', (done: Function) => {
      const addTranslationsForGivenPropertiesSpy = sandbox.stub().returns(Promise.resolve());
      const allOpenedInGivenVersionStub = sandbox.stub(DatapointsRepositoryFactory, 'allOpenedInGivenVersion').returns({ addTranslationsForGivenProperties: addTranslationsForGivenPropertiesSpy });

      const fsAccessStub = sandbox.stub(fs, 'access').callsArgWithAsync(2);

      const readCsvFileAsStreamStub = sandbox.stub(fileUtils, 'readCsvFileAsStream').returns(hi([datapointTranslation]));
      sandbox.stub(logger, 'info');

      createTranslations(context, (errors, externalContext) => {
        expect(errors).to.not.exist;
        expect(externalContext).to.equal(context);

        sinon.assert.calledOnce(fsAccessStub);
        sinon.assert.calledWith(fsAccessStub, '/some/path/lang/nl-nl/ddf--datapoints--company_scale--by--company--anno.csv', fs.constants.R_OK);

        sinon.assert.calledOnce(readCsvFileAsStreamStub);
        sinon.assert.calledWith(readCsvFileAsStreamStub, '/some/path', 'lang/nl-nl/ddf--datapoints--company_scale--by--company--anno.csv');

        sinon.assert.calledOnce(allOpenedInGivenVersionStub);
        sinon.assert.calledWith(allOpenedInGivenVersionStub, context.dataset._id, context.transaction.createdAt);

        sinon.assert.calledOnce(addTranslationsForGivenPropertiesSpy);
        sinon.assert.calledWith(addTranslationsForGivenPropertiesSpy, datapointTranslation, {
          language,
          source: datapointResource.path,
          resolvedProperties: { 'properties.anno': 1975, 'properties.company': 'mcrsft' }
        });

        done();
      });
    });

    it('should not import translations for datapoint if it is impossible to read a file with them', (done: Function) => {
      const addTranslationsForGivenPropertiesSpy = sandbox.stub().returns(Promise.resolve());
      const allOpenedInGivenVersionStub = sandbox.stub(DatapointsRepositoryFactory, 'allOpenedInGivenVersion').returns({ addTranslationsForGivenProperties: addTranslationsForGivenPropertiesSpy });

      const fsAccessStub = sandbox.stub(fs, 'access').callsArgWithAsync(2, 'Cannot Read File');

      const readCsvFileAsStreamStub = sandbox.stub(fileUtils, 'readCsvFileAsStream').returns(hi([datapointResource]));
      sandbox.stub(logger, 'info');

      createTranslations(context, (errors, externalContext) => {
        expect(errors).to.not.exist;
        expect(externalContext).to.equal(context);

        sinon.assert.calledOnce(fsAccessStub);
        sinon.assert.calledWith(fsAccessStub, '/some/path/lang/nl-nl/ddf--datapoints--company_scale--by--company--anno.csv', fs.constants.R_OK);

        sinon.assert.notCalled(readCsvFileAsStreamStub);
        sinon.assert.notCalled(allOpenedInGivenVersionStub);
        sinon.assert.notCalled(addTranslationsForGivenPropertiesSpy);

        done();
      });
    });
  });
});
