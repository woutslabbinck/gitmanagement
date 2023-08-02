
import * as fs from "fs";
import { DataFactory, Store } from "n3";
import * as path from "path";
import { GitEntry, parseGitEntry } from "./GitEntry";
import { fetchGitDescription, fetchGitRepos } from "./GitUtil";
import { fileAsStore, storeToString } from "./RDFUtil";
import { VCARD } from "./Vocabularies";

const { namedNode, literal } = DataFactory;
const stateFile = 'gitState.ttl'

/**
 * Finds all git directories starting from {@link directory}, parses them to {@link GitEntry} and stores the state in the starting directory.
 * This is an unsafe method and will overwrite the current state.
 * 
 * @param directory - Absolute path of the entry directory containg git repositories
 */
export async function fetchAndWrite(directory: string) {
    const repos = fetchGitRepos(directory);
    const entriesForRepo: GitEntry[] = []
    for (const dir of repos) {
        try {
            const gitDescription = await fetchGitDescription(dir)
            entriesForRepo.push(new GitEntry({ gitDescription, path: dir }))
        } catch (e) {
            console.log(e);
            console.log("could not fetch this dir " + dir);
        }
    }
    const store = new Store()

    for (const gitEntry of entriesForRepo) {
        store.addQuad(namedNode("urn:path" + directory), VCARD.terms.hasMember, gitEntry.identifier)
        store.addQuads(gitEntry.quads);
    }
    fs.writeFileSync(path.join(directory, stateFile), storeToString(store))
}

/**
 * Fetches and parses the state of the {@link directory} of the state of git repositories into an array of {@link GitEntry}.
 * 
 * @param directory - Absolute path of the entry directory containg git repositories
 * @returns 
 */
export async function load(directory: string): Promise<GitEntry[]> {
    const baseDirIdentifier = namedNode("urn:path" + directory)

    const entries: GitEntry[] = []
    const store: Store = await fileAsStore(path.join(directory, stateFile))
    const nodes = store.getQuads(baseDirIdentifier, VCARD.terms.hasMember, null, null).map(quad => quad.object)

    for (const nodeIdentifier of nodes) {
        const node = store.getQuads(nodeIdentifier, null, null, null);
        entries.push(parseGitEntry(node));
    }

    return entries
}

export function stateExists(directory: string): boolean {
    return fs.existsSync(path.join(directory, stateFile))
}