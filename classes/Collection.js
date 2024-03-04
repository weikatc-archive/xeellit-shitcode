class Collection extends Map {
    map(mapFunction) {
        const entries = this.entries()
        return Array.from({
            length: this.size
        }, () => {
            const [_, value] = entries.next().value
            return mapFunction(value)
        })
    }
    
    array(iter = 'values') {
    	return [ ...this[iter]() ]
    }
    
    first(count) {
    	const entries = this.values()
        if (typeof count !== 'number') return entries.next()?.value
        if (count < 0) return this.last(count * -1)
        return Array.from({ length: Math.min(this.size, count) }, () => entries.next().value)
    }
    
    last(count) {
    	const entries = this.array()
        if (typeof count !== 'number') return entries.pop()
        if (count < 0) return this.first(count * -1)
        return entries.slice(-count)
    }
    
    some(someFunction) {
    	for (const [_, value] of this) {
            if (someFunction(value)) return true
        }
        
        return false
    }

    find(findFunction) {
        for (const [_, value] of this) {
            if (findFunction(value)) return value
        }
    }

    filter(filterFunction) {
        const result = new Collection()

        for (const [key, value] of this) {
            if (filterFunction(value)) result.set(key, value)
        }

        return result
    }
}

module.exports = Collection