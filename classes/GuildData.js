const { mergeDefault, cloneObject } = require('discord.js').Util
const GuildEntries = require('./GuildEntries')

const model = {
    aliases: [],
    rooms: [],

    starboard: null,
    welcome: null,

    lastCase: 0,
    modRole: null,
    autoRole: null,
    penalty: [],
    prefixes: [{ name: 'x.' }],

    utils: {
        muterole: '',
        autoreact: []
    },
}

class GuildData {
    constructor(id, raw = {}) {
        if (typeof id === 'object') raw = id
        else if (typeof id === 'string') this.id = id

        this.patch(raw)
        this.entries = new GuildEntries(this.guild)
        xee.store.guilds.set(this.id, this)
    }

    patch(raw) {
        raw = mergeDefault(model, raw)
        for (const key in raw) this[key] = raw[key]
        if ('_id' in this) delete this._id
        return this
    }

    save() {
        return xee.db.collection('guilds').insertOne({
            ...model,
            id: this.id
        }).then(() => this)
    }

    update(query) {
        return xee.db.collection('guilds').findOneAndUpdate({ id: this.id }, query, { returnDocument: 'after' }).then(res => this.patch(res.value))
    }
    
    async fetch() {
        const data = await xee.db.collection('guilds').findOne({ id: this.id }).then(d => new GuildData(this.id, d))
        data.entries = this.entries
        return data
    }

    async purge() {
        await Promise.all([
            xee.db.collection('guilds').deleteOne({ id: this.id }),
            xee.db.collection('reactroles').deleteMany({ guild: this.id }),
            xee.db.collection('warns').deleteMany({ guild: this.id }),
            xee.db.collection('giveaways').deleteMany({ guild: this.id }),
            xee.db.collection('mutes').deleteMany({ guild: this.id }),
            xee.db.collection('bans').deleteMany({ guild: this.id }),
            xee.db.collection('cases').deleteMany({ guild: this.id }),
            xee.db.collection('reminds').deleteMany({ guild: this.id }),
            xee.db.collection('rooms').deleteMany({ guild: this.id })
        ])


        xee.store.mutes.filter(mute => mute.guildId === this.id).forEach(mute => {
            clearTimeout(mute.timeout)
            xee.store.mutes.delete(mute.id)
        })

        xee.store.giveaways.filter(giveaway => giveaway.guildId === this.id).forEach(giveaway => {
            clearTimeout(giveaway.timeout)
            xee.store.giveaways.delete(giveaway.messageId)
        })     
    }

    get guild() { return xee.client.guilds.cache.get(this.id) }
    get mutes() { return xee.store.mutes.filter(m => m.guildId === this.id) }
    get reactroles() { return xee.store.reactroles.filter(rr => rr.guild === this.id) }
    get giveaways() { return xee.store.giveaways.filter(ga => ga.guildId === this.id) }
    get polls() { return xee.store.polls.filter(poll => poll.guild?.id === this.id) }
    get muteRole() {  return this.guild.roles.cache.get(this.utils.muterole) }
    get logsChannel() { return this.guild.channels.cache.get(this.logs) }
    get modLogsChannel() { return this.guild.channels.cache.get(this.modLogs) }
}

module.exports = GuildData
module.exports.model = model
