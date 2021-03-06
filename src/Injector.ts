import { IDisposable } from "@sensenet/client-utils";
import { Constructable } from "./Types/Constructable";

export class Injector implements IDisposable {
    public async dispose() {
        /** */
        const singletons = Array.from(this.cachedSingletons.entries()).map((e) => e[1]);
        const disposeRequests = singletons
            .filter((s) => s !== this)
            .map(async (s) => {
            if (s.dispose) {
                await s.dispose();
            }
        });
        await Promise.all(disposeRequests);
    }

    public options: { parent: Injector, owner: any } = {
        parent: Injector.Default,
        owner: null,
    };

    public static Default: Injector = new Injector({ parent: undefined });
    public meta: Map<Constructable<any>, Array<Constructable<any>>> = new Map();

    private cachedSingletons: Map<Constructable<any>, any> = new Map();

    public GetInstance<T>(ctor: Constructable<T>, local: boolean = false, dependencies: Array<Constructable<T>> = []): T {
        if (dependencies.includes(ctor)) {
            throw Error(`Circular dependencies found.`);
        }
        if (this.cachedSingletons.has(ctor)) {
            return this.cachedSingletons.get(ctor) as T;
        }
        const fromParent = !local && this.options.parent && this.options.parent.GetInstance(ctor);
        if (fromParent) {
            return fromParent;
        }
        const deps = (Injector.Default.meta.get(ctor) || []).map((dep) => this.GetInstance(dep, local, [...dependencies, ctor]));
        const newInstance = new ctor(...deps);
        this.SetInstance(newInstance);
        return newInstance;

    }

    public SetInstance<T>(instance: T, key?: Constructable<any>) {
        this.cachedSingletons.set(key || instance.constructor as Constructable<T>, instance);
    }

    constructor(options?: Partial<Injector["options"]>) {
        this.options = { ...this.options, ...options };
    }
}
