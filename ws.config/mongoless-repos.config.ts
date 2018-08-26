const repositoryDescriptors = {
  // 'git@github.com:open-numbers/ddf--gapminder--systema_globalis.git': {
  //   master: ['HEAD'],
  //   stage: ['HEAD'],
  //   develop: ['HEAD', '3bc7bf0', 'ed8ed6c']
  // },
  'git@github.com:VS-work/ddf--ws-testing.git': {
    master: ['HEAD', 'be06a23', 'd9911b2', '6bae063', '9268712', '1e8a3b8', '1406026', '434f8f1', 'a003ffc', 'e6ef10e', '90b1e28', '0f78190'],
    'master-twin-for-e2e': ['HEAD', '9af6a48']
  },
  // 'git@github.com:open-numbers/ddf--ihme--death_cause.git': {master: ['HEAD']},
  // 'git@github.com:buchslava/readers-test-ds-bubbles-3.git': {master: ['HEAD']},
  // 'git@github.com:buchslava/readers-test-ds-gm-population.git': {master: ['HEAD']},
  // 'git@github.com:buchslava/readers-test-ds-gm-static-assets.git': {master: ['HEAD']},
  // 'git@github.com:buchslava/readers-test-ds-presentation-set.git': {master: ['HEAD']},
  // 'git@github.com:buchslava/readers-test-ds-sankey.git': {master: ['HEAD']},
  // 'git@github.com:buchslava/readers-test-ds-sg-mix-entity.git': {master: ['HEAD']},
  // 'git@github.com:buchslava/readers-test-ds-systema-globalis.git': {master: ['HEAD']},
  // 'git@github.com:buchslava/readers-test-ds-systema-globalis-tiny.git': {master: ['HEAD']},
  // 'git@github.com:buchslava/readers-test-ds-static-assets.git': {master: ['HEAD']},
  // 'git@github.com:buchslava/readers-test-ds-gm-population-big.git': {master: ['HEAD']},
  // 'git@github.com:buchslava/readers-test-sodertornsmodellen.git': {master: ['HEAD']},
  // 'git@github.com:open-numbers/ddf--gapminder--population.git': {
  //   master: ['HEAD'],
  //   develop: ['HEAD'],
  //   stage: ['HEAD']
  // },
  // 'git@github.com:open-numbers/ddf--cait--historical_emissions.git': {master: ['HEAD']},
  // 'git@github.com:open-numbers/ddf--sodertornsmodellen.git': {master: ['HEAD']},
  // 'git@github.com:open-numbers/ddf--open_numbers--world_development_indicators.git': {
  //   master: ['HEAD'],
  //   'merge-concepts': ['HEAD']
  // }
};
// const defaultRepository = 'VS-work/ddf--ws-testing';
const defaultRepository = 'open-numbers/ddf--gapminder--systema_globalis';
const defaultRepositoryCommit = 'HEAD';
const defaultRepositoryBranch = 'master';

const datasetsImportingConfig = Object.assign({
  'default': {
    dataset: defaultRepository,
    branch: defaultRepositoryBranch,
    commit: defaultRepositoryCommit
  }
}, repositoryDescriptors);
export { datasetsImportingConfig, defaultRepository, defaultRepositoryBranch, defaultRepositoryCommit, repositoryDescriptors };
