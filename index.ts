
import { Quad, Store, DataFactory } from "n3";
import { GitDescription, RepositoryType, fetchGitDescription, fetchGitRepos } from "./GitUtil"
import { NamedNode } from "n3";
import { GITMANAGEMENT, RDF, VCARD, XSD } from "./src/Vocabularies";
import * as path from "path"
import * as fs from "fs"
import { fileAsStore, storeToString } from "./src/RDFUtil";
const { namedNode, literal } = DataFactory;

const directory = "/home/wouts/Documents/repos"

async function firstFetch() {
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
        store.addQuad(namedNode("urn:path"+directory), VCARD.terms.hasMember,gitEntry.identifier)
        store.addQuads(gitEntry.quads);
    }
    fs.writeFileSync(path.join(directory,'gitState.ttl'),storeToString(store))
    
}
// firstFetch()

async function load(){
    const baseDirIdentifier = namedNode("urn:path"+directory)
    const store:Store = await fileAsStore(path.join(directory,'gitState.ttl'))
    const nodes = store.getQuads(baseDirIdentifier, VCARD.hasMember, null, null).map(quad => quad.object)

    const nodeIdentifier = nodes[0]
    const node = store.getQuads(nodeIdentifier,null,null,null);

    console.log(parseGitEntry(node))
}
// load()

export class GitEntry {
    protected gitDescription: GitDescription;
    protected _path: string
    protected lastUpdated: Date;

    constructor(args: { gitDescription: GitDescription, lastUpdated?: Date, path: string }) {
        const { path, gitDescription, lastUpdated } = args

        this.gitDescription = gitDescription;
        this.lastUpdated = lastUpdated ?? new Date();
        this._path = path;
    }

    get quads(): Quad[] {
        const store = new Store()
        switch (this.gitDescription.repositoryType) {
            case RepositoryType.CLONE:
                store.addQuad(this.identifier, RDF.terms.type, GITMANAGEMENT.terms.Cloned);

                break;
            case RepositoryType.FORK:
                store.addQuad(this.identifier, RDF.terms.type, GITMANAGEMENT.terms.Forked);
                break;

            default:
                break;
        }
        store.addQuad(this.identifier, GITMANAGEMENT.terms.description, literal(this.gitDescription.description));
        store.addQuad(this.identifier, GITMANAGEMENT.terms.lastFetched, literal(this.lastUpdated.toISOString(), XSD.terms.dateTime));
        store.addQuad(this.identifier, GITMANAGEMENT.terms.path, literal(this._path));
        store.addQuad(this.identifier, GITMANAGEMENT.terms.origin, namedNode(this.gitDescription.originURL));
        store.addQuad(this.identifier, GITMANAGEMENT.terms.organisation, namedNode(this.gitDescription.organisation));
        store.addQuad(this.identifier, GITMANAGEMENT.terms.repositoryName, namedNode(this.gitDescription.repositoryName));
        store.addQuad(this.identifier, GITMANAGEMENT.terms.visited, literal(1));
        return store.getQuads(null, null, null, null)
    }

    get identifier(): NamedNode {
        return namedNode("urn:path:" + this._path)
    }

    get path(): string {
        return this._path
    }

    
    get name() : string {
        return this.gitDescription.repositoryName
    }
    
    get description(): string {
        return this.gitDescription.description
    }
}

export function parseGitEntry(entryQuads: Quad[]): GitEntry {
    const store = new Store(entryQuads)
    let repositoryType = RepositoryType.UNKNOWN
    switch (store.getQuads(null, RDF.type, null, null)[0]!.object.value) {
        case GITMANAGEMENT.Cloned:
            repositoryType = RepositoryType.CLONE

            break;
        case GITMANAGEMENT.Forked:
            repositoryType = RepositoryType.FORK

            break;
        default:
            break;
    }
    const gitDescription = {
        organisation: store.getQuads(null, GITMANAGEMENT.organisation, null, null)[0]!.object.value,
        repositoryName: store.getQuads(null, GITMANAGEMENT.repositoryName, null, null)[0]!.object.value,
        originURL: store.getQuads(null, GITMANAGEMENT.origin, null, null)[0]!.object.value,
        description: store.getQuads(null, GITMANAGEMENT.description, null, null)[0]!.object.value,
        repositoryType: repositoryType
    }
    const path = store.getQuads(null, GITMANAGEMENT.path, null, null)[0]!.object.value;
    const lastUpdated = new Date(store.getQuads(null, GITMANAGEMENT.lastFetched, null, null)[0]!.object.value);

    return new GitEntry({ gitDescription, path, lastUpdated })
}