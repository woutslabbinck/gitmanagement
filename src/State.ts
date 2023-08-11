
import * as fs from "fs";
import { DataFactory, NamedNode, Quad, Store, Writer } from "n3";
import * as path from "path";
import { GitEntry, parseGitEntry } from "./GitEntry";
import { fetchGitDescription, fetchGitRepos } from "./GitUtil";
import { fileAsStore } from "./RDFUtil";
import { VCARD } from "./Vocabularies";

const { namedNode, literal, quad } = DataFactory;
const stateFile = 'gitState.ttl'

/**
 * Finds all git directories starting from {@link directory}, parses them to {@link GitEntry} and stores the state in the starting directory.
 * This is an unsafe method and will overwrite the current state.
 * 
 * @param directory - Absolute path of the entry directory containing git repositories
 */
export async function fetchAndWrite(directory: string): Promise<void>  {
    const state = await createState(directory)
    writeState(directory, state)
}

/**
 * Finds all git directories starting from {@link directory} and parses them to {@link GitEntry} 
 * 
 * @param directory - Absolute path of the entry directory containing git repositories
 */
export async function createState(directory: string): Promise<GitState> {
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
    const state = new GitState(directory, entriesForRepo)
    return state
}
/**
 * Stores the state in the directory.
 * This is an unsafe method and will overwrite the current state.
 * 
 * @param directory - Absolute path of the entry directory containing git repositories
 * @param state - State of all git repositories
 */
export function writeState(directory: string, state: GitState): void{
    const quads = state.quads
    const statePath = path.join(directory, stateFile)
    const stateSerialization = new Writer().quadsToString(quads)
    fs.writeFileSync(statePath, stateSerialization)
}

/**
 * Fetches and parses the state of the {@link directory} of the state of git repositories (local state) into an array of {@link GitEntry}.
 * 
 * @param directory - Absolute path of the entry directory containing git repositories
 * @returns 
 */
export async function loadState(directory: string): Promise<GitState> {
    const baseDirIdentifier = namedNode("urn:path" + directory)

    const entries: GitEntry[] = []
    const store: Store = await fileAsStore(path.join(directory, stateFile))
    const nodes = store.getQuads(baseDirIdentifier, VCARD.terms.hasMember, null, null).map(quad => quad.object)

    for (const nodeIdentifier of nodes) {
        const node = store.getQuads(nodeIdentifier, null, null, null);
        entries.push(parseGitEntry(node));
    }

    return new GitState(directory, entries)
}

export function stateExists(directory: string): boolean {
    return fs.existsSync(path.join(directory, stateFile))
}

export class GitState {
    private _entries: { [index: string]: GitEntry } = {};
    private _directory: string;

    public constructor(directory: string, entries?: GitEntry[]) {
        this._directory = directory;
        if (entries) {
            for (const entry of entries) {
                this._entries[entry.identifier.value] = entry
            }

        }
    }

    get quads(): Quad[] {
        const quads: Quad[] = []
        for (const gitEntry of this.entries) {
            quads.push(quad(this.directoryNamedNode, VCARD.terms.hasMember, gitEntry.identifier))
            quads.push(...gitEntry.quads);
        }
        return quads
    }

    get directory(): string {
        return this.directory
    }

    get entries(): GitEntry[] {
        return Object.values(this._entries)
    }

    get entryidentifiers(): string[] {
        const identifiers: string[] = []
        for (const entry of this.entries) {
            identifiers.push(entry.identifier.value)
        }
        return identifiers
    }

    private get directoryNamedNode(): NamedNode {
        return namedNode("urn:path" + this._directory)
    }

    /**
     * Get an entry from the collection of entries.
     * 
     * @param identifier - urn of the git entry
     * @returns 
     */
    public getEntry(identifier: string): GitEntry {
        const entry: GitEntry = this._entries[identifier]
        if (entry === undefined) {
            throw Error("Not found entry " + identifier)
        }
        return entry
    }

    /**
     * Adds/Updates an entry to the collection of entries.
     * @param entry 
     */
    public updateEntry(entry: GitEntry): void {
        this._entries[entry.identifier.value] = entry
    }
}

/**
 * Removes entries that were in the oldState, but not in the newState as this directory is removed locally.
 * @param oldState 
 * @param newState 
 */
export function updateState(oldState: GitState, newState: GitState): GitState {
    const entryIdentifiers = newState.entryidentifiers
    
    for (const entryIdentifier of entryIdentifiers) {
        const entry  = newState.getEntry(entryIdentifier)
        let visited = 1
        try {
            const oldEntryIfExists = oldState.getEntry(entryIdentifier)
            visited = oldEntryIfExists.visited +1
        } catch (e){

        }
        entry.updateVisited(visited)
    }
    return newState
}