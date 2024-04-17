import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';
import gitUrlParse from 'git-url-parse';
import fetch from 'cross-fetch';
import * as path from "path"
import * as fs from "fs"

export type GitDescription = {
    organisation: string
    repositoryName: string
    originURL: string
    description: string
    repositoryType: RepositoryType
}

export enum RepositoryType {
    UNKNOWN,
    FORK,
    CLONE
}
/**
 * Uses {@link https://www.npmjs.com/package/simple-git | simple-git} and {@link https://www.npmjs.com/package/git-url-parse | git-url-parse} to retrieve a description of a github repository.
 * 
 * Note that the function does a lot.
 * 
 * @param repositoryPath - The absolute path of a valid (local) git repository
 * @param options - currently empty
 * @returns A description of the git repository (based on the local repository)
 */
export async function fetchGitDescription(repositoryPath: string, options?: any): Promise<GitDescription> {
    const gitOptions: Partial<SimpleGitOptions> = {
        baseDir: repositoryPath,
        binary: 'git',
        maxConcurrentProcesses: 6,
        trimmed: false,
    };

    const git: SimpleGit = simpleGit(gitOptions);
    const config = await git.listConfig()
    let originURL = <string>config.all["remote.origin.url"]
    const originURLParsed = gitUrlParse(originURL)


    const organisation = originURLParsed.owner
    const repositoryName = originURLParsed.name
    // following request might fail due not knowing if it is an organisation or an owner

    const response = await fetch(`https://api.github.com/repos/${organisation}/${repositoryName}`)
    const ghApiJSON = await response.json()

    const description = ghApiJSON.description ?? ''
    let repositoryType: RepositoryType = RepositoryType.UNKNOWN;
    if (ghApiJSON) {
        repositoryType = ghApiJSON.source ? RepositoryType.FORK : RepositoryType.CLONE;
    }
    return {
        organisation,
        repositoryName,
        originURL: originURL.includes("@git") ? "ssh://" + originURL : originURL,
        description,
        repositoryType
    }
}

/**
 * Function that given a directory fetches paths from git directories
 * 
 * @param baseDirectory - The path to a directory that might contain directories that are git repositories
 * @returns A list of absolute paths from git directories.
 */
export function fetchGitRepos(baseDirectory: string): string[] {
    const gitDirectories: string[] = []

    const dirs = fs.readdirSync(baseDirectory, { withFileTypes: true }).filter(dir => dir.isDirectory()).map(dir => dir.name)

    // if git is in dir, stop here and return the absolute path
    if (dirs.includes('.git')) {
        return [baseDirectory]
    }
    if (!dirs.includes('.git') && dirs.includes('node_modules')) return []

    for (const dir of dirs) {

        const absPath = path.join(baseDirectory, dir)
        const foundGitRepos = fetchGitRepos(absPath)
        gitDirectories.push(...foundGitRepos)

    }
    return gitDirectories
}