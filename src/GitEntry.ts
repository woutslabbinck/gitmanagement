import { DataFactory, NamedNode, Quad, Store } from "n3";
import { GitDescription, RepositoryType } from "./GitUtil";
import { GITMANAGEMENT, RDF, XSD } from "./Vocabularies";
const { namedNode, literal } = DataFactory;

export class GitEntry {
    protected gitDescription: GitDescription;
    protected _path: string
    protected _lastUpdated: Date;
    protected _visited: number

    constructor({ gitDescription, lastUpdated, path, visited = 1 }: { gitDescription: GitDescription, lastUpdated?: Date, path: string, visited?: number }) {
        this.gitDescription = gitDescription;
        this._lastUpdated = lastUpdated ?? new Date();
        this._path = path;
        this._visited = visited
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
        store.addQuad(this.identifier, GITMANAGEMENT.terms.lastFetched, literal(this._lastUpdated.toISOString(), XSD.terms.dateTime));
        store.addQuad(this.identifier, GITMANAGEMENT.terms.path, literal(this._path));
        store.addQuad(this.identifier, GITMANAGEMENT.terms.origin, namedNode(this.gitDescription.originURL));
        store.addQuad(this.identifier, GITMANAGEMENT.terms.organisation, literal(this.gitDescription.organisation));
        store.addQuad(this.identifier, GITMANAGEMENT.terms.repositoryName, literal(this.gitDescription.repositoryName));
        store.addQuad(this.identifier, GITMANAGEMENT.terms.visited, literal(this.visited));
        return store.getQuads(null, null, null, null)
    }

    get identifier(): NamedNode {
        return namedNode("urn:path:" + this._path)
    }

    get path(): string {
        return this._path
    }

    get name(): string {
        return this.gitDescription.repositoryName
    }

    get description(): string {
        return this.gitDescription.description
    }

    get visited(): number {
        return this._visited
    }

    get lastUpdated(): Date {
        return this._lastUpdated
    }

    public updateVisited(visited:number): void {
        this._visited = visited
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
    const visited = parseInt(store.getQuads(null, GITMANAGEMENT.visited, null, null)[0]!.object.value);
    return new GitEntry({ gitDescription, path, lastUpdated, visited })
}