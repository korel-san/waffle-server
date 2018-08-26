import * as path from 'path';
import * as shell from 'shelljs';
import * as fsExtra from 'fs-extra';
import {config} from '../../ws.config/config';

class GitUtils {
  private SHORT_COMMIT_LENGTH: number = 7;
  private sourceRoot: string = config.PATH_TO_SOURCE_REPOSITORIES;
  private reposRoot: string = config.PATH_TO_DDF_REPOSITORIES;

  public getRepositoryNameByUrl(repoUrl: string): string {
    if (repoUrl.indexOf(':') === -1) {
      return repoUrl;
    }

    try {
      return repoUrl.split(':')[1].replace(/\.git$/, '');
    } catch (error) {
      return null;
    }
  }

  public getRepoPath(dataset: string, branch: string, commit: string): string {
    return path.resolve(this.reposRoot, dataset, `${branch}-${commit}`);
  }

  public getSourcePath(sourceName: string): string {
    return path.resolve(this.sourceRoot, sourceName) ;
  }

  public async initRepository(repoPath: string, repository: string): Promise<string | void> {
    const command = `clone ${repository} ${repoPath}`;

    const isFolderExisting = await this.checkNonexistentFolder(repoPath);

    if (!isFolderExisting) {
      return this.execCommand(repoPath, command);
    }

    return Promise.resolve();
  }

  public checkNonexistentFolder(folderPath: string): Promise<void> {
    return new Promise ((resolve: Function, reject: Function) => {
      fsExtra.pathExists(folderPath, (error: Error, exists: boolean) => {
        if (error) {
          return reject(error);
        }

        return resolve(exists);
      });
    });
  }

  public async checkoutToGivenCommit(repoPath: string, branch: string, commit: string): Promise<string | Error> {
    const commands = [
      `fetch --all --prune`,
      `reset --hard origin/${branch}`,
      `checkout ${branch}`,
      `pull origin ${branch}`,
      `clean -f -x`,
      `checkout ${commit}`
    ];

    for (const command of commands) {
      await this.execCommand(repoPath, command);
    }

    return await this.getHeadCommitHash(repoPath);
  }

  public execCommand(repoPath: string, command: string): Promise<string> {
    return new Promise<string>((resolve: Function) => {
      const gitCommand = `git --git-dir=${repoPath}/.git --work-tree=${repoPath} ${command}`;

      shell.exec(gitCommand, {silent: true, async: true}, (code: number, stdout: string, stderr: string) => {
        if (code !== 0) {
          throw new Error(`Command was failed: ${command}\nSTDERR: ${stderr}`);
        }

        return resolve(stdout);
      });
    });
  }

  public getShortenHash(hash: string): string {
    return hash.substr(0, this.SHORT_COMMIT_LENGTH);
  }

  public async copySourceToTargetFolder(sourcePath: string, repoPath: string): Promise<string> {
    const command = `cp -R -fi ${sourcePath} ${repoPath}`;

    return new Promise<string>((resolve: Function) => {
      shell.exec(command, {silent: true, async: true}, (code: number, stdout: string, stderr: string) => {
        if (code !== 0) {
          throw new Error(`Command was failed: ${command}\nSTDERR: ${stderr}`);
        }

        return resolve(stdout);
      });
    });
  }

  private async getHeadCommitHash(repoPath: string): Promise<string> {
    const command = `rev-parse --verify HEAD`;

    const hash: string = await this.execCommand(repoPath, command);
    return this.getShortenHash(hash);
  }
}

export const gitService = new GitUtils();
