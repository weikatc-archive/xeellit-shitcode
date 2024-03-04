const { MessageEmbed } = require('discord.js')
const { parseDuration, firstUpper } = require('../client/util')

class GuildEntries {

    /**
     * @constructor
     * @param {import('discord.js').Guild} guild 
     */

    #sending = false
    #logQueue = []
    constructor(guild) {
        this.guild = guild
    }

    async addLog(embed) {
        this.#logQueue.push(embed)

        if (!this.logTimeout || this.logTimeout._destroyed) {
            this.logTimeout = setTimeout(this.#sendLog.bind(this), 10000)
        } else if (this.#logQueue.length >= 10 || this.#logQueue.reduce((a, b) => a + b.length, 0) > 6000) {
            if (!this.#sending) this.#sendLog()
        }
    }

    async #sendLog() {
        this.#sending = true
        clearTimeout(this.logTimeout)

        const embeds = this.#logQueue.slice(0, 10)
        this.#logQueue = this.#logQueue.slice(10)

        while (embeds.reduce((a, b) => a + b.length, 0) > 6000) {
            const lastLog = embeds.pop()
            this.#logQueue.unshift(lastLog)
        }

        const guildData = await this.guild.getData()
        const channel = guildData.logsChannel

        channel && channel.permissionsFor(this.guild.me).has([ 'SEND_MESSAGES', 'EMBED_LINKS' ]) && await channel.send({ embeds })
        this.#sending = false
        
        if (this.#logQueue.length) {
            const toAddLog = this.#logQueue.pop()
            this.addLog(toAddLog)
        }
    }

    async createCase(type, member, mod, data) {
        if (!GuildEntries.TYPES[type]) throw new Error('Такой тип не поддерживается')

        const guildData = await this.guild.getData()
        const caseId = ++guildData.lastCase
        let messageId = null

        if (guildData.modLogsChannel?.permissionsFor(this.guild.me)?.has([ 'SEND_MESSAGES', 'VIEW_CHANNEL', 'EMBED_LINKS' ])) {
            const channel = guildData.modLogsChannel

            const embed = new MessageEmbed()
                .setColor(xee.settings.color)
                .setAuthor({ name: GuildEntries.TYPES[type], iconURL: this.guild.iconURL({ dynamic: true }) })
                .addField('Пользователь', `[[${(member.user || member).tag}]](https://discord.com/users/${member.id})\n${member.id}`, true)
                .addField('Модератор', `[[${(mod.user || mod).tag}]](https://discord.com/users/${mod.id})\n${mod.id}`, true)
                .setFooter(`Случай: #${caseId}`)
                .setTimestamp()

            if (data.time || data.muteTime) embed.addField('Длительность', xee.constructor.ruMs(data.time || data.muteTime))
            if (type === 'warn' && data.penalty) embed.addField('Наказание', 
                firstUpper(`${{ ban: 'блокировка', kick: 'исключение', mute: 'заглушение' }[data.penalty.type]}${data.penalty.time ? ` на ${xee.constructor.ruMs(parseDuration(data.penalty.time))} за ${data.formattedWarns}` : ''}`))
            embed.addField('Причина', data.reason?.length ? data.reason.slice(0, 1024) : `\`${guildData.prefixes[0].name}reason ${caseId} <причина>\``)

            await guildData.update({ $set: { lastCase: caseId } })
            messageId = await channel.send({ embeds: [embed] }).then(r => r.id).catch(() => null) 
        } else await guildData.update({ $set: { lastCase: caseId } })

        await xee.db.collection('cases').insertOne({
            mod: mod.id,
            user: member.id,
            guild: this.guild.id,
            date: Date.now(),

            penalty: type === 'warn' && data.penalty || null,
            time: (data.muteTime || data.time) || null,
            reason: data.reason || null,

            messageId,
            caseId,
            type
        })
    }


    fetch(user) {
        const userId = xee.client.users.resolveId(user)
        return xee.db.collection('cases').find(userId ? { user: userId, guild: this.guild.id } : { guild: this.guild.id }).toArray()
    }
}

GuildEntries.TYPES = {
    ban: 'Блокировка',
    kick: 'Исключение',
    mute: 'Заглушение',
    warn: 'Предупреждение',
    unmute: 'Снятие заглушения',
    rewarn: 'Снятие предупреждения',
    unban: 'Снятие блокировки',
    muteTime: 'Продление заглушения'
}

module.exports = GuildEntries
