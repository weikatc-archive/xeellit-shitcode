const { MessageEmbed } = require('discord.js')

class Poll {
    constructor(data) {
        this.messageId = data.message
        this.channelId = data.channel
        this.id = data._id

        this.title = data.title
        this.values = data.values || []
        this.votes = data.votes || []

        this.end = data.end

        xee.store.polls.set(this.id, this)
    }

    load() {
        if (!this.messageId) this.send()
        if (this.end - Date.now() >= 172800000) return
        this.timeout = setTimeout(() => this.stop(), this.end - Date.now())
    }

    async send() {
        let message = await this.channel.send({ embeds: [ this.createEmbed(3447003) ] })
        xee.react(message, Poll.emojis.slice(0, this.values.length))


        this.messageId = message.id
        xee.db.collection('polls').updateOne({ _id: this.id }, { $set: { message: message.id } })

        return this
    }

    async stop() {
        xee.store.polls.delete(this.id)
        xee.db.collection('polls').deleteOne({ _id: this.id })
        clearTimeout(this.timeout)

        const message = await this.getMessage()
        if (!message) return

        message.reactions.removeAll().catch(() => null)

        return message.edit({ embeds: [ this.createEmbed(15158332, true) ] })
    }

    createEmbed(color, end = false) {
        let values = this.values.map(value => ({ ...value, users: 0 }))
        this.votes.forEach(vote => values[vote.valueIndex].users += 1)

        let naibolshee = values.every(v => v.users === 0) ? null : values.sort((b, a) => a.users - b.users)[0]

        return new MessageEmbed()
            .setColor(color)
            .setAuthor({ name: this.title, iconURL: this.guild?.iconURL({ dynamic: true }) })
            .setFooter(end ? 'Опрос завершён' : 'Опрос начался')
            .setTimestamp(this.end)
            .setDescription(values
                .sort((b, a) => b.index - a.index)
                .map((value, index) => `${naibolshee?.text === value.text ? ':star: ' : ''}\`#${index + 1}${end ? 
                    `, ${value.users} / ${this.votes.length}${this.votes.length ? ` — ${Math.floor(value.users / this.votes.length * 100)}%` : ''}` : 
                    ''}\`: ${value.text}`).join('\n\n'))
    }

    addVote(user, valueIndex, remove = false) {
        this.votes = this.votes.filter(vote => vote.user !== user)
        if (!remove) this.votes.push({ user, valueIndex })
        xee.db.collection('polls').updateOne({ _id: this.id }, { $set: { votes: this.votes } })

        return this
    }

    getMessage() {
        return this.channel?.permissionsFor(this.guild?.me)?.has('READ_MESSAGE_HISTORY') ? this.channel.messages.fetch(this.messageId).catch(() => null) : Promise.resolve(null)
    }

    get channel() {
        return xee.client.channels.cache.get(this.channelId)
    }

    get guild() {
        return this.channel?.guild
    }

    static emojis = [
        '1%EF%B8%8F%E2%83%A3',
        '2%EF%B8%8F%E2%83%A3',
        '3%EF%B8%8F%E2%83%A3',
        '4%EF%B8%8F%E2%83%A3',
        '5%EF%B8%8F%E2%83%A3',
        '6%EF%B8%8F%E2%83%A3',
        '7%EF%B8%8F%E2%83%A3',
        '8%EF%B8%8F%E2%83%A3',
        '9%EF%B8%8F%E2%83%A3'
    ]
}

module.exports = Poll
