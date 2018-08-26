import * as Config from './ws.config';
import * as Routes from './ws.routes';
import { logger } from './ws.config/log';
import { ServiceLocator } from './ws.service-locator';
import {datasetsImportingConfig, defaultRepository, defaultRepositoryBranch, defaultRepositoryCommit} from './ws.config/mongoless-repos.config';
import {importDatasets} from './ws.services/dataset-import.service';

export class Application {
  public listen: Function;

  private config: any;

  public constructor(serviceLocator: ServiceLocator) {
    this.configure(serviceLocator);
    this.registerRoutes(serviceLocator);

    this.config = serviceLocator.get('config');

    const app = serviceLocator.getApplication();
    this.listen = app.listen.bind(app);
  }

  public run(): void {
    try {
      this.config.DEFAULT_DATASET = defaultRepository;
      this.config.DEFAULT_DATASET_BRANCH = defaultRepositoryBranch;
      this.config.DEFAULT_DATASET_COMMIT = defaultRepositoryCommit;
      // TODO: remove?
      this.config.DEFAULT_DATASET_VERSION = defaultRepositoryCommit;
      this.listen(this.config.PORT);
      importDatasets(datasetsImportingConfig);
      logger.info(`Express server listening on port ${this.config.PORT} in ${this.config.NODE_ENV} mode`);
    } catch (startupError) {
      logger.error(startupError);
      process.exit(1);
    }
  }

  private configure(serviceLocator: ServiceLocator): void {
    Config.configureWaffleServer(serviceLocator);
  }

  private registerRoutes(serviceLocator: ServiceLocator): void {
    Routes.registerRoutes(serviceLocator);
  }
}
