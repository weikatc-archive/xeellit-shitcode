const { Collection } = require('@discordjs/collection')
const { BitField, WebhookClient } = require('discord.js')
const fetch = require('../client/fetch')

class Interserver {
    constructor(raw) {
        this.name = raw._id
        this.creator = raw.creator
        
        this.channels = raw.channels
        this.webhooks = raw.webhooks || []
        this.localBlock = raw.localBlock || []
        this.block = raw.block
        this.mods = raw.mods

        this.logs = raw.logs
        this.messages = new Collection()
        this.flags = new InterserverFlags(raw.flags ?? 0)

        if (!raw.webhooks) xee.db.collection('interservers').updateOne({ _id: this.name }, { $set: { webhooks: [] } })
        if (!raw.localBlock) xee.db.collection('interservers').updateOne({ _id: this.name }, { $set: { localBlock: [] } })

        xee.store.interservers.set(raw._id, this)
    }

    getContent(message) {
        const videos = message.attachments.filter(a => a.contentType?.startsWith('video/')).map(v => '\n' + v.url)
        return message.content.slice(0, 4000 - videos.length) + videos
    }

    async sendMessage(data, message) {
        let webhooks = this.webhooks
        if ('content' in data && !data.content?.length) data.content = undefined
        if (data.content?.includes('discord.gg')) return

        if (message) {
            if (this.block.some(b => b.user === message.author.id)) return xee.react(message, '❎')
            webhooks = webhooks.filter(c => c.channel !== message.channel.id)
            webhooks = webhooks.filter(c => !this.localBlock.some(b => b.user === message.author.id && b.channel === c.channel))
        }

        const sentMessages = await fetch('https://discordproxy.oddyamill.workers.dev/', {
            json: {
                message: data,
                webhooks: webhooks.map(w => `https://discord.com/api/webhooks/${w.id}/${w.token}`)
            },
            method: 'POST'
        }).then(d => d.map(m => ({ message: m?.id, channel: m?.channel_id })).filter(w => w.message))

        return this.messages.set(message?.id, {
            message: message.id,
            guild: message.guild?.id,
            channel: message.channel?.id,
            author: message.author?.id,
            messages: sentMessages
        })
    }

    editMessage(data, messageId, bot) {
        const message = this.messages.get(messageId)
        if (!message) return message

        if ('content' in data && !data.content?.length) delete data.content
        if (data.content?.includes('discord.gg')) return

        return Promise.all(
            message.messages.map(message => {
                if (bot) {
                    return xee.client.api.channels(message.channel).messages(message.message).patch({
                        data: {
                            content: data.content,
                            embeds: data.embeds.map(e => e.toJSON()),
                            allowed_mentions: {
                                parse: []
                            }
                        }
                    }).catch(() => null)
                }

                const webhook = this.webhooks.find(w => w.channel === message.channel)
                if (!webhook) return

                const webhookClient = webhook.client = new WebhookClient(webhook)
                return webhookClient.editMessage(message.message, data).catch(error => {
                    if ([50027, 10015, 10016].includes(error.code)) this.deleteChannel(message.channel)
                })
            })
        )
    }

    deleteMessage(messageId) {
        const message = this.messages.get(messageId)
        if (!message) return message
        const bot = message.bot

        return Promise.all(
            message.messages.map(message => {
                if (bot) {
                    return xee.client.api.channels(message.channel).messages(message.message).delete().catch(() => null)
                }

                const webhook = this.webhooks.find(w => w.channel === message.channel)
                if (!webhook) return

                const webhookClient = webhook.client = new WebhookClient(webhook)
                return webhookClient.deleteMessage(message.message).catch(error => {
                    if ([50027, 10015, 10016].includes(error.code)) this.deleteChannel(webhook.channel)
                })
            })
        )
    }

    async setMute(user, reason = null, channel) {
        let type = 'INTERSERVER_MUTE'

        const body = {
            user: typeof user === 'string' ? user : user.id,
            reason
        }

        if (channel) {
            type = 'INTERSERVER_LOCAL_MUTE'
            body.channel = channel
            this.localBlock.push(body)
        } else {
            this.block.push(body)
        }

        xee.db.collection('interservers').updateOne({ _id: this.name }, { $push: { [type === 'INTERSERVER_MUTE' ? 'block' : 'localBlock']: body } })
        if (xee.cluster) xee.cluster.send(type, { type: 'add', name: this.name, body })
    }

    async removeMute(user, channel) {
        const id = typeof user === 'string' ? user : user.id
        let type = 'INTERSERVER_MUTE'

        if (channel) {
            type = 'INTERSERVER_LOCAL_MUTE'
            this.localBlock = this.localBlock.filter(c => c.user !== id && c.channel !== channel)
        } else {
            this.block = this.block.filter(c => c.user !== id)
        }

        xee.db.collection('interservers').updateOne({ _id: this.name }, { $pull: { [type === 'INTERSERVER_MUTE' ? 'block' : 'localBlock']: { user: id, channel } } })
        if (xee.cluster) xee.cluster.send(type, { type: 'remove', name: this.name, id, channel })
        
        return this
    }

    async addChannel(channelId, webhookData) {
        if (Array.isArray(channelId)) return Promise.all(channelId.map(id => this.addChannel(id)))
        const id = xee.client.channels.resolveId(channelId)
        const data = {
            channel: id,
            id: webhookData.id,
            token: webhookData.token
        }

        this.webhooks.push(data)
        if (xee.cluster) xee.cluster.send('INTERSERVER_CHANNEL', { name: this.name, type: 'add', channel: data })
        await xee.db.collection('interservers').updateOne({ _id: this.name }, { $push: { webhooks: data } })

        return this
    }

    async deleteChannel(channelId) {
        if (Array.isArray(channelId)) return Promise.all(channelId.map(id => this.deleteChannel(id)))
        const id = xee.client.channels.resolveId(channelId)

        const channel = this.webhooks.find(w => w.channel === id)
        if (!channel) return channel

        this.webhooks = this.webhooks.filter(c => c.id !== channel.id)
        if (xee.cluster) xee.cluster.send('INTERSERVER_CHANNEL', { name: this.name, type: 'remove', channel: id })
        await xee.db.collection('interservers').updateOne({ _id: this.name }, { $set: { webhooks: this.webhooks.map((w) => ({ channel: w.channel, id: w.id, token: w.token })) } })

        return this
    }

    async sendLog(message) {
        if (!this.logs) return null

        return xee.client.api.channels(this.logs).messages.post({
            data: message
        }).catch((e) => {
            if (e.code === 10003) {
                    xee.db.collection('interservers').updateOne({ _id: this.name }, { $set: { logs: null }})
                    this.logs = null
            }
        })
    }

    static async create(name, ownerId, flags) {
        if (xee.store.interservers.has(name)) return false

        const data = await xee.db.collection('interservers').insertOne({
            _id: name,
            creator: ownerId,
            createdAt: Date.now(),
            joinCode: name,
            channels: [],
            mods: [],
            block: [],
            localBlock: [],
            webhooks: [],
            flags: new InterserverFlags(flags).bitfield
        }).then(r => r.ops[0])

        if (xee.cluster) xee.cluster.send('INTERSERVER_CREATE', data)
        return new Interserver(data)
    }
}

class InterserverFlags extends BitField {}
InterserverFlags.FLAGS = {
    PRIVATE: 1 << 0,
    LISTED: 1 << 1
}

module.exports = Interserver
module.exports.InterserverFlags = InterserverFlags
