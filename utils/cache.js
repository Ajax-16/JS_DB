export class Cache {

    constructor() {
        this.cache = {};
    }

    set(key, value) {
        this.cache[key] = value;
    }

    get(key) {
        return this.cache[key];
    }

    has(key) {
        return key in this.cache;
    }

    delete(key) {
        delete this.cache[key];
    }

}