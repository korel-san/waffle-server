import * as sinon from 'sinon';
import { expect } from 'chai';

import '../../ws.repository';

import * as ddfql from '../../ws.ddfql/ddf-entities-query-normalizer';
import * as commonService from '../../ws.services/common.service';
import * as conceptsService from '../../ws.services/concepts.service';
import * as ddfQueryValidator from '../../ws.ddfql/ddf-query-validator';
import { EntitiesRepositoryFactory } from '../../ws.repository/ddf/entities/entities.repository';
import * as entitiesService from '../../ws.services/entities.service';

const sandbox = sinon.createSandbox();

describe('Entities service', () => {

  afterEach(() => sandbox.restore());

  it('cannot get entities: database error', (done: Function) => {

    const expectedError = '[DB]: query execution error';

    const context = {
      dataset: {
        _id: 'dsId'
      },
      version: 1111111
    };

    const findEntityPropertiesStub = sandbox.stub().callsArgWithAsync(3, expectedError);
    const currentVersionStub = sandbox.stub(EntitiesRepositoryFactory, 'currentVersion').returns({ findEntityProperties: findEntityPropertiesStub });

    entitiesService.getEntities(context, (error) => {
      expect(error).to.equal(expectedError);

      sinon.assert.calledWith(currentVersionStub, context.dataset._id, context.version);
      done();
    });
  });

  it('gets entities', (done: Function) => {
    const context = {
      dataset: {
        _id: 'dsId'
      },
      version: 1111111,
      domainGid: 'geo',
      headers: ['geo', 'name'],
      where: {
        $and: [
          { name: 'bla' }
        ]
      }
    };

    const expectedEntities = [
      { geo: 'usa', name: 'USA' }
    ];

    const findEntityPropertiesStub = sandbox.stub().callsArgWithAsync(3, null, expectedEntities);
    const currentVersionStub = sandbox.stub(EntitiesRepositoryFactory, 'currentVersion').returns({ findEntityProperties: findEntityPropertiesStub });

    entitiesService.getEntities(context, (error, externalContext) => {
      expect(error).to.not.exist;

      expect(externalContext.entities).to.deep.equal(expectedEntities);

      sinon.assert.calledWith(currentVersionStub, context.dataset._id, context.version);
      sinon.assert.calledWith(findEntityPropertiesStub, context.domainGid, context.headers, context.where);
      done();
    });
  });

  it('cannot collect entities by ddfql: error while querying for an appropriate concepts', (done: Function) => {
    const expectedError = '[Error]: concepts querying error';

    const context = {};

    sandbox.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    sandbox.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);

    sandbox.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, expectedError);

    entitiesService.collectEntitiesByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('cannot collect entities by ddfql: concepts were not found', (done: Function) => {
    const expectedError = 'Concepts are not found';

    const context = {};

    sandbox.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    sandbox.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);

    sandbox.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, null, null);

    entitiesService.collectEntitiesByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('cannot collect entities by ddfql: generated mongo query is invalid in join clause', (done: Function) => {
    const expectedError = 'generated mongo query is invalid in join clause';
    const validationResult = {
      valid: false,
      log: expectedError
    };

    const expectedConcepts = [
      { gid: 'geo' },
      { gid: 'name' }
    ];

    const context = {
      dataset: {
        _id: 'dsId'
      },
      query: {
        select: {
          key: 'geo',
          value: ['name']
        },
        where: {
          $and: [
            { name: 'bla' }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              $and: [
                { geo: 'usa' }
              ]
            }
          }
        }
      },
      version: 1111111,
      domainGid: 'geo',
      headers: ['geo', 'name'],
      where: {
        $and: [
          { name: 'bla' }
        ]
      },
      concepts: expectedConcepts
    };

    const normalizedQuery = {
      join: {
        $geo: {
          key: 'geo',
          where: {
            $and: [
              { geo: 'usa' }
            ]
          }
        }
      }
    };

    sandbox.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    sandbox.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);
    sandbox.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, null, { concepts: expectedConcepts });
    const currentVersionStub = sandbox.stub(EntitiesRepositoryFactory, 'currentVersion');
    const normalizeEntitiesStub = sandbox.stub(ddfql, 'normalizeEntities').returns(normalizedQuery);
    const validateMongoQueryStub = sandbox.stub(ddfQueryValidator, 'validateMongoQuery').returns(validationResult);

    entitiesService.collectEntitiesByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);

      sinon.assert.calledWith(currentVersionStub, context.dataset._id, context.version);
      sinon.assert.calledWith(normalizeEntitiesStub, context.query);
      sinon.assert.calledWith(validateMongoQueryStub, normalizedQuery.join.$geo);

      done();
    });
  });

  it('cannot collect entities by ddfql: fails querying entities for join clause', (done: Function) => {
    const expectedError = '[Error] findEntityPropertiesByQuery has failed in join clause';
    const validationResult = {
      valid: true
    };

    const expectedConcepts = [
      { gid: 'geo' },
      { gid: 'name' }
    ];

    const context = {
      dataset: {
        _id: 'dsId'
      },
      query: {
        select: {
          key: 'geo',
          value: ['name']
        },
        where: {
          $and: [
            { name: 'bla' }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              $and: [
                { geo: 'usa' }
              ]
            }
          }
        }
      },
      version: 1111111,
      domainGid: 'geo',
      headers: ['geo', 'name'],
      where: {
        $and: [
          { name: 'bla' }
        ]
      },
      concepts: expectedConcepts
    };

    const normalizedQuery = {
      join: {
        $geo: {
          key: 'geo',
          where: {
            $and: [
              { geo: 'usa' }
            ]
          }
        }
      }
    };

    sandbox.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    sandbox.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);
    sandbox.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, null, { concepts: expectedConcepts });
    sandbox.stub(ddfql, 'normalizeEntities').returns(normalizedQuery);
    sandbox.stub(ddfQueryValidator, 'validateMongoQuery').returns(validationResult);

    const findEntityPropertiesByQueryStub = sandbox.stub().callsArgWithAsync(1, expectedError);
    sandbox.stub(EntitiesRepositoryFactory, 'currentVersion').returns({ findEntityPropertiesByQuery: findEntityPropertiesByQueryStub });

    entitiesService.collectEntitiesByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      done();
    });
  });

  it('cannot collect entities by ddfql: final mongo query generated from ddfql is invalid', (done: Function) => {
    const expectedError = 'final generated mongo query is invalid';
    const validationResult = {
      valid: false,
      log: expectedError
    };

    const expectedConcepts = [
      { gid: 'geo' },
      { gid: 'name' }
    ];

    const expectedEntities = [
      { geo: 'usa', name: 'USA' }
    ];

    const context = {
      dataset: {
        _id: 'dsId'
      },
      query: {
        select: {
          key: 'geo',
          value: ['name']
        },
        where: {
          $and: [
            { name: 'bla' }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              $and: [
                { geo: 'usa' }
              ]
            }
          }
        }
      },
      version: 1111111,
      domainGid: 'geo',
      headers: ['geo', 'name'],
      where: {
        $and: [
          { name: 'bla' }
        ]
      },
      concepts: expectedConcepts
    };

    const normalizedQuery = {
      join: {
        $geo: {
          key: 'geo',
          where: {
            $and: [
              { geo: 'usa' }
            ]
          }
        }
      }
    };

    const finalQuery = {
      where: {
        $and: [
          {}
        ]
      }
    };

    sandbox.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    sandbox.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);
    sandbox.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, null, { concepts: expectedConcepts });
    const normalizeEntitiesStub = sandbox.stub(ddfql, 'normalizeEntities').returns(normalizedQuery);
    const substituteEntityJoinLinks = sandbox.stub(ddfql, 'substituteEntityJoinLinks').returns(finalQuery);

    const validateMongoQueryStub = sandbox.stub(ddfQueryValidator, 'validateMongoQuery');
    validateMongoQueryStub.onFirstCall().returns({ valid: true });
    validateMongoQueryStub.onSecondCall().returns(validationResult);

    const findEntityPropertiesByQueryStub = sandbox.stub().callsArgWithAsync(1, null, expectedEntities);
    const currentVersionStub = sandbox.stub(EntitiesRepositoryFactory, 'currentVersion').returns({ findEntityPropertiesByQuery: findEntityPropertiesByQueryStub });

    entitiesService.collectEntitiesByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);

      sinon.assert.calledOnce(findEntityPropertiesByQueryStub);
      sinon.assert.calledTwice(validateMongoQueryStub);

      sinon.assert.calledOnce(currentVersionStub);
      sinon.assert.calledWith(currentVersionStub, context.dataset._id, context.version);

      sinon.assert.calledWith(normalizeEntitiesStub, context.query);

      sinon.assert.calledTwice(validateMongoQueryStub);
      sinon.assert.calledWith(validateMongoQueryStub, normalizedQuery.join.$geo);

      done();
    });
  });

  it('cannot collect entities by ddfql: fails while querying entities by final query', (done: Function) => {
    const expectedError = '[DB]: entities query execution has failed';
    const validationResult = {
      valid: true
    };

    const expectedConcepts = [
      { gid: 'geo' },
      { gid: 'name' }
    ];

    const expectedEntities = [
      { geo: 'usa', name: 'USA' }
    ];

    const context = {
      dataset: {
        _id: 'dsId'
      },
      query: {
        select: {
          key: 'geo',
          value: ['name']
        },
        where: {
          $and: [
            { name: 'bla' }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              $and: [
                { geo: 'usa' }
              ]
            }
          }
        }
      },
      version: 1111111,
      domainGid: 'geo',
      headers: ['geo', 'name'],
      where: {
        $and: [
          { name: 'bla' }
        ]
      },
      concepts: expectedConcepts
    };

    const normalizedQuery = {
      join: {
        $geo: {
          key: 'geo',
          where: {
            $and: [
              { geo: 'usa' }
            ]
          }
        }
      }
    };

    const finalQuery = {
      where: {
        $and: [
          {}
        ]
      }
    };

    sandbox.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    sandbox.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);
    sandbox.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, null, { concepts: expectedConcepts });
    sandbox.stub(ddfql, 'normalizeEntities').returns(normalizedQuery);
    const substituteEntityJoinLinks = sandbox.stub(ddfql, 'substituteEntityJoinLinks').returns(finalQuery);

    sandbox.stub(ddfQueryValidator, 'validateMongoQuery').returns(validationResult);

    const findEntityPropertiesByQueryStub = sandbox.stub();
    findEntityPropertiesByQueryStub.onFirstCall().callsArgWithAsync(1, null, expectedEntities);
    findEntityPropertiesByQueryStub.onSecondCall().callsArgWithAsync(1, expectedError);

    sandbox.stub(EntitiesRepositoryFactory, 'currentVersion').returns({ findEntityPropertiesByQuery: findEntityPropertiesByQueryStub });

    entitiesService.collectEntitiesByDdfql(context, (error) => {
      expect(error).to.equal(expectedError);
      sinon.assert.calledTwice(findEntityPropertiesByQueryStub);
      done();
    });
  });

  it('collects entities by ddfql', (done: Function) => {
    const validationResult = {
      valid: true
    };

    const expectedConcepts = [
      { gid: 'geo' },
      { gid: 'name' }
    ];

    const expectedEntities = [
      { gid: 'usa', name: 'USA' }
    ];

    const context = {
      dataset: {
        _id: 'dsId'
      },
      query: {
        select: {
          key: 'geo',
          value: ['name']
        },
        where: {
          $and: [
            { name: 'bla' }
          ]
        },
        join: {
          $geo: {
            key: 'geo',
            where: {
              $and: [
                { geo: 'usa' }
              ]
            }
          }
        }
      },
      version: 1111111,
      domainGid: 'geo',
      headers: ['geo', 'name'],
      where: {
        $and: [
          { name: 'bla' }
        ]
      },
      concepts: expectedConcepts
    };

    const normalizedQuery = {
      join: {
        $geo: {
          key: 'geo',
          where: {
            $and: [
              { geo: 'usa' }
            ]
          }
        }
      }
    };

    const finalQuery = {
      where: {
        $and: [
          {}
        ]
      }
    };

    sandbox.stub(ddfQueryValidator, 'validateDdfQueryAsync').callsArgWithAsync(1, null, context);
    sandbox.stub(commonService, 'findDefaultDatasetAndTransaction').callsArgWithAsync(1, null, context);
    sandbox.stub(conceptsService, 'getConcepts').callsArgWithAsync(1, null, { concepts: expectedConcepts });
    sandbox.stub(ddfql, 'normalizeEntities').returns(normalizedQuery);
    const substituteEntityJoinLinks = sandbox.stub(ddfql, 'substituteEntityJoinLinks').returns(finalQuery);

    const validateMongoQueryStub = sandbox.stub(ddfQueryValidator, 'validateMongoQuery').returns(validationResult);

    const findEntityPropertiesByQueryStub = sandbox.stub().callsArgWithAsync(1, null, expectedEntities);

    sandbox.stub(EntitiesRepositoryFactory, 'currentVersion').returns({ findEntityPropertiesByQuery: findEntityPropertiesByQueryStub });

    entitiesService.collectEntitiesByDdfql(context, (error, externalContext) => {
      expect(error).to.not.exist;
      expect(externalContext.entities).to.deep.equal(expectedEntities);

      sinon.assert.calledTwice(validateMongoQueryStub);
      sinon.assert.calledWith(validateMongoQueryStub, finalQuery.where);

      sinon.assert.calledWith(substituteEntityJoinLinks, normalizedQuery, { $geo: ['usa'] });

      sinon.assert.calledTwice(findEntityPropertiesByQueryStub);
      done();
    });
  });
});
