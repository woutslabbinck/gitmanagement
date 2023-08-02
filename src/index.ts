
import { spawn } from 'child_process';
import { GitEntry } from "./GitEntry";
import { fetchAndWrite, load, stateExists } from "./State";
import { environmentPrompt, repositoryChoicePrompt, repositoryPartialPrompt } from "./cli/InquirerCliExtractor";
import { inputParameters } from "./cli/YargsCliExtractor";

export async function runner() {
    const params = inputParameters();
    const directory = params.path;

    let entries: GitEntry[]
    if (stateExists(directory)) {
        console.log("Loading state file.");
        entries = await load(directory)
    } else {
        console.log("Fetching all repositories.");
        await fetchAndWrite(directory)
        entries = await load(directory)
    }


    const partialRepository = await repositoryPartialPrompt();
    const repositoryPath = await repositoryChoicePrompt(partialRepository, entries);
    const environment = await environmentPrompt();
    switch (environment) {
        case "terminal":
            spawn('gnome-terminal', ['--working-directory=' + repositoryPath]).unref()

            break;
        case "code":
            spawn('code', [repositoryPath]).unref()
            break;
        case "webstorm":
            spawn('webstorm', [repositoryPath]).unref()
            break;
        case "explorer":
            spawn('nautilus', [repositoryPath]).unref()
            break;    
        default:
            break;
    }
    process.exit()
}