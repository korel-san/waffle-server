import '../../../ws.repository';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { ChangesDescriptor } from '../../../ws.import/utils/changes-descriptor';

const sandbox = sinon.createSandbox();

describe('Changes descriptor', () => {

  afterEach(() => sandbox.restore());

  it('should get gid', () => {
    const descriptor = new ChangesDescriptor({
      object: {
        gid: 'foundation',
        foundation: 'xsoft'
      },
      metadata: {
        action: 'remove',
        type: 'entities'
      }
    });

    expect(descriptor.gid).to.equal('xsoft');
  });

  it('should get concept of changed object', () => {
    const descriptor = new ChangesDescriptor({
      object: {
        gid: 'foundation',
        foundation: 'xsoft'
      },
      metadata: {
        action: 'remove',
        type: 'entities'
      }
    });

    expect(descriptor.concept).to.equal('foundation');
  });

  it('should seek for a concept in primaryKey in case of object creation', () => {
    const descriptor = new ChangesDescriptor({
      object: {
        gid: 'NOT_USED',
        foundation: 'xsoft'
      },
      metadata: {
        file: {
          new: {
            path: 'ddf--entities--company--foundation.csv',
            name: 'ddf--entities--company--foundation',
            schema: {
              fields: [
                {
                  name: 'foundation'
                },
                {
                  name: 'full_name_changed'
                },
                {
                  name: 'is--foundation'
                }
              ],
              primaryKey: 'foundation'
            }
          }
        },
        action: 'create',
        type: 'entities'
      }
    });

    expect(descriptor.concept).to.equal('foundation');
  });

  it('extracts original object (state before changes): object is being updated', () => {
    const descriptor = new ChangesDescriptor({
      object: {
        gid: 'foundation',
        foundation: 'xsoft',
        'data-origin': {
          foundation: 'xsoft',
          'is--foundation': true,
          full_name_changed: 'bla'
        }
      },
      metadata: {
        file: {
          new: {
            path: 'ddf--entities--company--foundation.csv',
            name: 'ddf--entities--company--foundation',
            schema: {
              fields: [
                {
                  name: 'foundation'
                },
                {
                  name: 'full_name_changed'
                },
                {
                  name: 'is--foundation'
                }
              ],
              primaryKey: 'foundation'
            }
          }
        },
        action: 'update',
        type: 'entities'
      }
    });

    expect(descriptor.original).to.deep.equal({
      foundation: 'xsoft',
      'is--foundation': true,
      full_name_changed: 'bla'
    });
  });

  it('extracts original object (state before changes): entity is being removed', () => {
    const descriptor = new ChangesDescriptor({
      object: {
        gid: 'foundation',
        foundation: 'xsoft',
        'data-origin': {
          foundation: 'xsoft',
          'is--foundation': true,
          full_name_changed: 'bla'
        }
      },
      metadata: {
        file: {
          new: {
            path: 'ddf--entities--company--foundation.csv',
            name: 'ddf--entities--company--foundation',
            schema: {
              fields: [
                {
                  name: 'foundation'
                },
                {
                  name: 'full_name_changed'
                },
                {
                  name: 'is--foundation'
                }
              ],
              primaryKey: 'foundation'
            }
          }
        },
        action: 'update',
        type: 'entities'
      }
    });

    expect(descriptor.original).to.deep.equal({
      foundation: 'xsoft',
      'is--foundation': true,
      full_name_changed: 'bla'
    });
  });

  it('extracts original object (state before changes): create action does not use data-origin property', () => {

    const changes = {
      object: {
        gid: 'foundation',
        foundation: 'xsoft'
      },
      metadata: {
        file: {
          new: {
            path: 'ddf--entities--company--foundation.csv',
            name: 'ddf--entities--company--foundation',
            schema: {
              fields: [
                {
                  name: 'foundation'
                },
                {
                  name: 'full_name_changed'
                },
                {
                  name: 'is--foundation'
                }
              ],
              primaryKey: 'foundation'
            }
          }
        },
        action: 'create',
        type: 'entities'
      }
    };

    const descriptor = new ChangesDescriptor(changes);

    expect(descriptor.original).to.deep.equal(changes.object);
  });
});
