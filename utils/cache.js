export class Cache {
    constructor(bufferSize) {
        this.cache = new Map();
        this.bufferSize = bufferSize;
        this.bufferCount = 0;
        this.keysInOrder = [];
    }

    set(key, value) {
        if (this.bufferCount >= this.bufferSize) {
            const oldestKey = this.keysInOrder.shift();
            this.cache.delete(oldestKey);
            this.bufferCount--;
        }
        this.cache.set(key, value);
        this.keysInOrder.push(key);
        this.bufferCount++;
    }

    get(key) {
        return this.cache.get(key);
    }

    has(key) {
        return this.cache.has(key);
    }

    delete(key) {
        if (this.has(key)) {
            this.cache.delete(key);
            const keyIndex = this.keysInOrder.indexOf(key);
            if (keyIndex !== -1) {
                this.keysInOrder.splice(keyIndex, 1);
                this.bufferCount--;
            }
        }
    }
}