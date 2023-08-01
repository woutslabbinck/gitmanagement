import inquirer from 'inquirer';
import select, { Separator } from '@inquirer/select';
import { Quad, Store, DataFactory } from "n3";
import { GitDescription, RepositoryType, fetchGitDescription, fetchGitRepos } from "./GitUtil"
import { NamedNode } from "n3";
import { GITMANAGEMENT, RDF, VCARD, XSD } from "./src/Vocabularies";
import * as path from "path"
import * as fs from "fs"
import { fileAsStore, storeToString } from "./src/RDFUtil";
import { GitEntry, parseGitEntry } from '.';
import Choice from 'inquirer/lib/objects/choice';
const { spawn } = require('child_process');

const child = spawn('pwd');
const { namedNode, literal } = DataFactory;

const directory = "/home/wouts/Documents/repos"

async function main() {
    const entries = await load(directory)
    const answers = await inquirer.prompt([{
        name: 'repo',
        message: 'Type in part of the repo',
        type: 'input'
    }])

    const entriesLeft = entries.filter(entry => {
        const name = entry.name.toLocaleLowerCase()
        const answer = answers.repo.toLocaleLowerCase()
        return name.includes(answer)
    })

    const choices: Array<{ value: string, name?: string, description?: string, disabled?: boolean | string }> = []

    for (const entry of entriesLeft) {
        choices.push({
            name: entry.name,
            value: entry.path,
            description: entry.description ?? "No description found"
        })
    }

    const answer = await select({
        message: 'Select the repository to open',
        choices: choices
      });
    console.log(answer);
    
    const environmentChoices: Array<{ value: string, name?: string, description?: string, disabled?: boolean | string }>  = [
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
const envAnswer = await select({
    message: 'Select the environment',
    choices: environmentChoices
})
    switch (envAnswer) {
        case "terminal":
            spawn('gnome-terminal',['--working-directory='+answer])

            break;
        case "code":
            spawn('code',[answer])

            break;
        case "webstorm":
            spawn('webstorm',[answer])

            break;
        default:
            break;
    }
      
      
}

main()

async function load(directory: string): Promise<GitEntry[]> {
    const baseDirIdentifier = namedNode("urn:path" + directory)

    const entries: GitEntry[] = []
    const store: Store = await fileAsStore(path.join(directory, 'gitState.ttl'))
    const nodes = store.getQuads(baseDirIdentifier, VCARD.terms.hasMember, null, null).map(quad => quad.object)

    for (const nodeIdentifier of nodes) {
        const node = store.getQuads(nodeIdentifier, null, null, null);
        entries.push(parseGitEntry(node));
    }

    return entries
}