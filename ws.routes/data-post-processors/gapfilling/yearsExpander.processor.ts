import * as _ from 'lodash';

export {
  expandYears
};

function expandYears(dataToExpandYears: any, neededRange?: any, options?: any): any {
  options = options || {};
  let geoColumnIndex = options.geoColumnIndex || 0;
  let yearColumnIndex = options.yearColumnIndex || 1;

  return _.chain(dataToExpandYears)
    .groupBy((row: any) => row[geoColumnIndex])
    .map((row: any) => {
      const firstRecord = _.first(row) as any[];

      let yearsThatShouldBeAdded = _.difference(_.range(neededRange.from, neededRange.to + 1), _.map(row, yearColumnIndex));
      let extraRecords = yearsThatShouldBeAdded.map((year: any) => {
        let templateRecord = new Array(firstRecord.length).fill(null);
        templateRecord[geoColumnIndex] = firstRecord[geoColumnIndex];
        templateRecord[yearColumnIndex] = year;
        return templateRecord;
      });

      return _.sortBy(row.concat(extraRecords), yearColumnIndex);
    })
    .flatten()
    .value();
}
