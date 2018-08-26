import * as _ from 'lodash';

export const NONEXISTENT_STATE = 'nonexistent';
export const INIT_STATE = 'init';
export const VALIDATING_STATE = 'validating';
export const VALIDATED_STATE = 'validated';
export const FAILED_VALIDATING_STATE = 'failed_validating';
export const CLONING_STATE = 'cloning';
export const FAILED_CLONING_STATE = 'failed_cloning';
export const READY_STATE = 'ready';

class DatasetsStatesTracker {
  private datasetsStates: object = {

  };

  public addOne(fullDatasetName: string): void {
    this.datasetsStates[fullDatasetName] = INIT_STATE;
  }

  public addMany(datasetsName: string[]): void {
    datasetsName.forEach((datasetName: string) => this.addOne(datasetName));
  }

  public getAll(): object {
    return _.clone(this.datasetsStates);
  }

  public getOnlyReady(): object {
    return _.pickBy(this.datasetsStates, (value: string) => value === READY_STATE);
  }

  public getState(fullDatasetName: string): string {
    return this.datasetsStates[fullDatasetName] || NONEXISTENT_STATE;
  }

  public changeState(fullDatasetName: string, state: string): string {
    const oldState = this.datasetsStates[fullDatasetName];
    this.datasetsStates[fullDatasetName] = state;
    console.log(`State of dataset '${fullDatasetName}' was changed: ${oldState} -> ${state}`);
    return this.datasetsStates[fullDatasetName];
  }

}

export const datasetStatesTracker = new DatasetsStatesTracker();
