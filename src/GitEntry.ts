import { Quad, Store, DataFactory, NamedNode } from "n3";
import { GitDescription, RepositoryType } from "./GitUtil";
import { GITMANAGEMENT, RDF, XSD } from "./Vocabularies";
const { namedNode, literal } = DataFactory;

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