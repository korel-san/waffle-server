import {CLONING_STATE, datasetStatesTracker, FAILED_CLONING_STATE, FAILED_VALIDATING_STATE, READY_STATE, VALIDATED_STATE, VALIDATING_STATE} from '../ws.utils/dataset-state-tracker';
import * as _ from 'lodash';
import {gitService} from '../ws.routes/ddfql/git-utils';

export {
  importDatasets
};

interface Context {
  dataset: string;
  branch: string;
  commit: string;
  repository: string;
  fullDatasetPath: string;
  fullSourcePath: string;
}

function getNormalizedDatasets(datasetsConfig: object): Context[] {
  return _.chain(datasetsConfig)
    .omit(['default'])
    .flatMap((branches: object, repository: string) => {
      return _.flatMap(branches, (hashes: string[], branch: string) => {
        return _.map(hashes, (hash: string) => {
          const dataset = gitService.getRepositoryNameByUrl(repository);
          const commit = gitService.getShortenHash(hash);
          const fullDatasetPath = gitService.getRepoPath(dataset, branch, commit);
          const fullSourcePath = gitService.getSourcePath(dataset);
          return {hash, commit, branch, repository, dataset, fullDatasetPath, fullSourcePath};
        });
      });
    })
    .value();
}

function getRepositories(datasetsConfig: object): string[] {
  return Object.keys(_.omit(datasetsConfig, 'default'));
}

function cloneAllSources(datasetsConfig: object): Promise<any> {
  const repositories = getRepositories(datasetsConfig);

  const cloningRepositories = _.map(repositories, (repository: string) => {
    const sourcePath = gitService.getSourcePath(gitService.getRepositoryNameByUrl(repository));

    return new Promise(() => gitService.initRepository(sourcePath, repository));
  });

  return Promise.all(cloningRepositories).then((result: object[]) => {
    console.log(result);
  });
}

async function importDatasets(datasetsConfig: object): Promise<void> {
  const normalizedDatasets = getNormalizedDatasets(datasetsConfig);

  try {
    await cloneAllSources(datasetsConfig);
  } catch(error) {
    console.error(error);
    return;
  }

  _.forEach(normalizedDatasets, async (context: Context) => {
    try {
      await removeDatasetFolder(context);
    } catch (error) {
      console.error(error);
      return;
    }

    datasetStatesTracker.addOne(context.fullDatasetPath);

    try {
      datasetStatesTracker.changeState(context.fullDatasetPath, VALIDATING_STATE);
      await validateDataset(context);
      datasetStatesTracker.changeState(context.fullDatasetPath, VALIDATED_STATE);
    } catch (error) {
      datasetStatesTracker.changeState(context.fullDatasetPath, FAILED_VALIDATING_STATE);
      console.error(error);
      return;
    }

    try {
      datasetStatesTracker.changeState(context.fullDatasetPath, CLONING_STATE);
      await cloningDataset(context);
      datasetStatesTracker.changeState(context.fullDatasetPath, READY_STATE);
    } catch (error) {
      datasetStatesTracker.changeState(context.fullDatasetPath, FAILED_CLONING_STATE);
      console.error(error);
      return;
    }
  });
}


async function removeDatasetFolder(context: Context): Promise<void> {
  return Promise.resolve();
}

function validateDataset(options: object): Promise<void> {
  return Promise.resolve();
}

async function cloningDataset(context: Context): Promise<void> {
  const {fullDatasetPath: repoPath, fullSourcePath: sourcePath} = context;

  await gitService.initRepository(sourcePath, context.repository);

  await gitService.initRepository(repoPath, sourcePath);

  await gitService.copySourceToTargetFolder(sourcePath, repoPath);

  await gitService.checkoutToGivenCommit(repoPath, context.branch, context.commit);
}

