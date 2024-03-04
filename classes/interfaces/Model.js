class Model {
    constructor(id, data) {
        this.id = id
        this.patch(data)
    }

    patch(data) {
        for (const key in this.constructor.MODEL) {
            this[key] = data?.[key] || this.constructor.MODEL[key]
        }

        return this
    }

    async save() {
        const query = {}

        for (const key in this.constructor.MODEL) {
            query[key] = this[key] ?? this.constructor.MODEL[key]
        }

        await xee.db.collection(this.constructor.COLLECTION).updateOne({
            id: this.id
        }, { $set: query }, { upsert: true })

        return this
    }

    update(query) {
        return xee.db.collection(this.constructor.COLLECTION).findOneAndUpdate({ 
            id: this.id 
        }, query, { returnDocument: 'after' }).then(res => this.patch(res.value))
    }

    static async findOne(id) {
        if (typeof id === 'string') id = { id }
        const data = await xee.db.collection(this.COLLECTION).findOne(id)
        const result = new this(data?.id ?? id.id, data)
        if (!data) result.save()
        return result
    }
}

module.exports = Model