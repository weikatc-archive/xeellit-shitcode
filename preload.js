const { ReactionCollector, Message, Guild, GuildMember, User } = require('discord.js')
const GuildData = require('./classes/GuildData')
const MemberData = require('./classes/MemberData')

Object.defineProperties(Guild.prototype, {
    getData: {
        value() {
            if (this.data) return Promise.resolve(this.data)
            return xee.store._queue[this.id] || (() => 
                xee.store._queue[this.id] = new Promise(async resolve => {
                    const data = await xee.db.collection('guilds').findOne({ id: this.id })
                    if (!data) resolve(await ( new GuildData(this.id) ).save())
                    else resolve(new GuildData(this.id, data))
                    delete xee.store._queue[this.id]
                }) 
            )()
        }
    },

    data: {
        get() {
            return xee.store.guilds.get(this.id)
        }
    }
})

Object.defineProperty(User.prototype, 'tag', {
    get() {
        return this.discriminator === '0' ? this.username : `${this.username}#${this.discriminator}`
    }
})

Object.defineProperties(GuildMember.prototype, {
    getData: {
        async value() {
            if (this.data) return this.data

            const exists = await xee.db.collection('members').findOne({
                user: this.id,
                guild: this.guild.id
            }) ?? await xee.db.collection('members').insertOne({
                user: this.id,
                guild: this.guild.id,
                messages: 0,
                xp: 0
            }).then(res => res.ops[0])
            return new MemberData(exists)
        }
    },

    data: {
        get() {
            return xee.store.members.get(`${this.id}${this.guild.id}`)
        }
    }
})

ReactionCollector.prototype._handleChannelDeletion = function(channel) {
    if (channel.id === this.message?.channel?.id) this.stop('channelDelete')
}

Message.prototype.createReactionCollector = function(options = { idle: 120000 }) {
            const collector = new ReactionCollector(this, options)

            if ('user' in options) {
                options.user = xee.client.users.resolveId(options.user)

                const _collector = xee.client.collectors.get(options.user)
                if (_collector) _collector.stop()
                
                xee.client.collectors.set(options.user, collector)

                collector.on('end', async (_, reason) => {
                    xee.client.collectors.delete(options.user)
                    if (!collector.message.deleted 
                        && !reason.endsWith('Delete') 
                        && this.channel?.permissionsFor(collector.message.guild.me)?.has('MANAGE_MESSAGES')
                    ) this.reactions.removeAll().catch(() => null)
                })
            }

            return collector
        }

let locate = (fullkey, obj) => {
    let keys = fullkey.split('.')
    let val = obj[keys.shift()]
    if (!val) return null
    for (let key of keys) {
        if (!val[key]) return val
        val = val[key]
        if (Array.isArray(val)) return val.join('\n')
    }
    return val || null
}
String.prototype.parse = function (options = {}) {
    if (!this) return this
    return this.split(' ')
        .map(str =>
            str.replace(
                /\{\{(.+)\}\}/gi,
                (matched, key) => locate(key, options) || matched
            )
        ).join(' ')
}

require('fs/promises').readFile('./assets/logo.txt', { encoding: 'utf8' }).then(console.log)
