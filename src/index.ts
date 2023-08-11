
import { spawn } from 'child_process';
import { GitState, createState, loadState, stateExists, updateState, writeState } from "./State";
import { environmentPrompt, repositoryChoicePrompt, repositoryPartialPrompt } from "./cli/InquirerCliExtractor";
import { inputParameters } from "./cli/YargsCliExtractor";

export async function runner() {
    const params = inputParameters();
    const directory = params.path;
    const reload = params.reload;



    let state: GitState
    if (stateExists(directory)) {
        console.log("Loading state file.");
        state = await loadState(directory)
        if (reload) {
            console.log("Fetching all repositories again.");
            const newState = await createState(directory)
            state = updateState(state, newState)
            writeState(directory, state)           
        } 

    } else {
        console.log("Fetching all repositories.");
        state = await createState(directory)
        writeState(directory, state)
    }

    const entries = state.entries

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