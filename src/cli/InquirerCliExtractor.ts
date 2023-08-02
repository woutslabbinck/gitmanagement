import select from '@inquirer/select';
import inquirer from 'inquirer';
import { GitEntry } from '../GitEntry';

/**
 * Fetch a partial string of the repository name from the user.
 * 
 * @returns 
 */
export async function repositoryPartialPrompt(): Promise<string> {
    const answers = await inquirer.prompt([{
        name: 'repo',
        message: 'Type in part of the repo',
        type: 'input'
    }])
    return answers.repo
}

type Choice = { value: string, name?: string, description?: string, disabled?: boolean | string }
/**
 * Filters the repositories that do include the partial repository string (case-insensitive).
 * 
 * @param repository The partial repository string.
 * @param entries The array of git repositories fetched.
 * @returns 
 */
function decideChoices(repository: string, entries: GitEntry[]): Choice[] {
    const choices: Choice[] = []
    const filteredEntries = entries.filter(entry => {
        const name = entry.name.toLocaleLowerCase()
        const answer = repository.toLocaleLowerCase()
        return name.includes(answer)
    })

    for (const entry of filteredEntries) {
        choices.push({
            name: entry.name,
            value: entry.path,
            description: entry.description ?? "No description found"
        })
    }
    if (choices.length === 0){
        console.log("no match found, showing all repositories");
        for (const entry of entries) {
            choices.push({
                name: entry.name,
                value: entry.path,
                description: entry.description ?? "No description found"
            })
        }
    }
    return choices
}

/**
 * Fetches the repository path the user wants to open.
 * 
 * @param repository The partial repository string.
 * @param entries The array of git repositories fetched.
 * @returns 
 */
export async function repositoryChoicePrompt(repository: string, entries: GitEntry[]): Promise<string> {
    const choices = decideChoices(repository, entries)
    const answer = await select({
        message: 'Select the repository to open',
        choices: choices
    });
    return answer
}
/**
 * Fetches the environment the user wants to be used.
 * Currently hardcoded, but a good feature would be for this to be programmable.
 * @returns 
 */
export async function environmentPrompt(): Promise<string> {
    const environmentChoices: Choice[] = [
        {
            name: "terminal",
            value: "terminal",
        },
        {
            name: "Visual Studio Code",
            value: "code",
        },
        {
            name: "WebStorm",
            value: "webstorm",
        }
    ]
    const answer = await select({
        message: 'Select the environment',
        choices: environmentChoices
    })
    return answer
}