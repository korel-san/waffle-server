import { spawn } from 'child_process';
import { keys, includes } from 'lodash';
import { repositoryDescriptors as repositoryDescriptorsSource } from './ws.config/mongoless-repos.config';

let importProcess;
let repositoryStateDescriptors = {};

const repositories = keys(repositoryDescriptorsSource);

function normalizeRepositoryDescriptorsSource(): void {
  for (const repository of repositories) {
    const branches = keys(repositoryDescriptorsSource[repository]);

    if (!includes(branches, 'master')) {
      repositoryDescriptorsSource[repository].master = ['HEAD'];
    }
  }
}

export function mongolessImport(): void {
  if (!importProcess) {
    importProcess = spawn('node', ['mongoless-import-processing.js']);

    importProcess.stdout.on('data', (data: string) => {
      if (!data) {
        return;
      }

      const allFeedback = `${data}`.split('\n');

      for (const feedback of allFeedback) {
        if (!feedback || feedback.indexOf('#') !== 0) {
          console.log(feedback);

          return;
        }

        let content;

        try {
          content = JSON.parse(feedback.substr(1));
        } catch (err) {
          console.log(err, feedback);
          return;
        }

        switch (content.action) {
          case 'empty-queue':
            importProcess.kill();
            importProcess = null;

            console.log('finish', JSON.stringify(repositoryStateDescriptors, null, 2));
            break;
          case 'repository-imported':
            repositoryStateDescriptors = Object.assign({}, repositoryStateDescriptors, content.descriptors);
            console.log(content.repo + ' imported');

            break;
          case 'status':
            break;
          default:
            break;
        }
      }
    });

    importProcess.stderr.on('data', (data: string) => console.log(`${data}`));
  }

  normalizeRepositoryDescriptorsSource();

  for (const repository of repositories) {
    importProcess.stdin.write(repository + '\n');
  }
}

mongolessImport();
