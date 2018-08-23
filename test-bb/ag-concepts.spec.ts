import { initData, testsDescriptors } from 'vizabi-ddfcsv-reader/dist/test-cases-concepts';

describe('foo', () => {
  it('bar', (done: Function) => {
    console.log(JSON.stringify(initData, null, 2));
    console.log(JSON.stringify(testsDescriptors, null, 2));

    done();
  });
});
