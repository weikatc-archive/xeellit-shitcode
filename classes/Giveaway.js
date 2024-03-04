const { Collection } = require('@discordjs/collection')

const messages = [[
    'Классно! **{{member}}** получает **{{item}}**!',
    'Ого! **{{member}}**, видно, удача на твоей стороне! Ты получаешь **{{item}}**.',
    'Боже, **{{member}}**, ты видно везунчик! Ты получаешь {{item}}!'
], [
    'Неплохо! {{members}} получают **{{item}}**!',
    '{{members}}, какая удача! Вы получаете **{{item}}**.',
    'Отлично! {{members}} получают **{{item}}**!'
]]

class Giveaway {
    constructor(data) {
        this.messageId = data.message
        this.guildId = data.guild
        this.end = data.end

        xee.store.giveaways.set(this.messageId, this)
    }

    async fetch() {
        return xee.db.collection('giveaways').findOne({ message: this.messageId })
    }

    setTimeout() {
        if (this.end - Date.now() >= 172800000) return
        this.timeout = setTimeout(() => this.stop(), this.end - Date.now())
    }

    async stop() {
        const data = await this.fetch().then(d => this.delete(d))
        const channel = await xee.client.channels.fetch(data.channel).catch(() => null)
        if (!channel || !channel.viewable || !channel.permissionsFor(channel.guild.me).has(['READ_MESSAGE_HISTORY', 'EMBED_LINKS'])) return

        const message = await channel.messages.fetch(this.messageId).catch(() => null)
        if (!message || !message.embeds.length) return

        const reaction = message.reactions.cache.get('🎉')
        if (!reaction) return

        const winners = await Giveaway.getWinners(message, reaction, { count: data.winners })
        message.embeds[0].description = null

        await message.edit({
            embeds: [message.embeds[0]
                .setColor('RED')
                .addField(`**Победител${winners.length === 1 ? 'ь' : 'и'}**:`, winners.length ? winners.map(w => `> <@${w}>`).join('\n') : 'Победителей нет. Какой ужас. :sob:')
                .setFooter('Розыгрыш завершён')]
        })

        if (winners.length && message.channel.permissionsFor(message.guild.me).has('SEND_MESSAGES')) message.channel.send({
            content: xee.random(messages[winners.length === 1 ? 0 : 1]).parse({ member: `<@${winners[0]}>`, members: winners.map(w => `<@${w}>`).join(' '), item: message.embeds[0].author.name }),
            allowedMentions: { users: winners }
        })
    }

    delete(d) {
        xee.db.collection('giveaways').deleteOne({ message: this.messageId })
        xee.store.giveaways.delete(this.id)
        return d
    }

    get guild() {
        return xee.client.guilds.cache.get(this.guildId)
    }

    static async getWinners(message, reaction, options = {}) {
        let members = await message.channel.guild.members.fetch()
        if (options.filter) members = members.filter(options.filter)
        let users = await new Promise(async resolve => {
            let collection = new Collection
            let after

            while (!0) {
                const fetched = await reaction.users.fetch({ limit: 100, after })
                collection = collection.concat(fetched)

                if (fetched.size < 100) break
                after = fetched.last().id
            }

            return resolve(collection)
        }).then(u => u.filter(u => members.has(u.id) && !u.bot).map(u => u.id))
        return Array.from({ length: options.count }, () => {
            if (!users.length) return
            const user = xee.random(users)
            users = users.filter(u => u !== user)
            return user
        }).filter(Boolean)
    }
}

module.exports = Giveaway
