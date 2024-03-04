const { MessageEmbed } = require('discord.js')
const { mergeDefault } = require('../client/util')

class MemberData {
    #cooldown
    #messages = 0
    constructor(memberData) {
        this.userId = memberData.user
        this.guildId = memberData.guild
        this.lastUpdate = memberData.lastUpdate ?? null

        this.totalXp = memberData.xp || 0
        this.level = MemberData.xpMethod(this.totalXp, 'level') || 0
        this.xp = MemberData.xpMethod(this.totalXp, 'xp') || 0
        this.messages = memberData.messages ?? 0
        this.#messages = this.messages

        this.joinTime = memberData.joinTime ?? -1
        this.voiceTime = memberData.voiceTime ?? 0
        this.voiceChannel = memberData.voiceChannel ?? null

        this.background = memberData.background
        xee.store.members.set(`${this.userId}${this.guildId}`, this)
    }

    addXp(count, message, query = false) {
        if (this.level >= 999) return query ? {} : this
        if (!count) return query ? {} : this

        const toNext = xee.calculateXp(this.level + 1)
        
        this.xp += count
        this.totalXp += count

        const updateQuery = { 
            $inc: { 
                xp: count 
            }, 
            $set: { 
                messages: this.messages 
            } 
        }

        if (this.xp >= toNext) {
            this.level = MemberData.xpMethod(this.totalXp, 'level')
            this.xp = MemberData.xpMethod(this.totalXp, 'xp')
            this.lastUpdate = Date.now()

            this.fetchRoles()
            this.sendUp(message?.channel)

            updateQuery['$set'].lastUpdate = this.lastUpdate
        }

        if (message) {
            this.#cooldown = Date.now() + (this.guild.data.levels.cooldown || 6e4)
        }

        if (!query) this.update(updateQuery)

        return query ? updateQuery : this
    }

    update(query) {
        return xee.db.collection('members').updateOne({ user: this.userId, guild: this.guildId }, query)
    }

    async calculateVoiceTime(stop = true) {
        if (this.joinTime === -1) return Promise.resolve()
        const xpMultiplier = (await this.guild.getData()).levels?.voiceXpCount ?? 15

        const now = Date.now()
        const sessionTime = now - this.joinTime

        this.voiceTime += sessionTime
        this.joinTime = stop ? -1 : Date.now()
        if (stop) this.voiceChannel = null

        return this.update(mergeDefault({ $set: {
            voiceTime: this.voiceTime,
            joinTime: this.joinTime,
            voiceChannel: this.voiceChannel
        } }, this.guild?.data?.levels?.voiceXp ? this.addXp(Math.floor(sessionTime / 6e4  * xpMultiplier), false, true) : {}))
    }

    startVoice(channelId) {
        channelId = xee.client.channels.resolveId(channelId)
        this.joinTime = Date.now()
        this.voiceChannel = channelId
        this.update({ $set: { voiceChannel: channelId, joinTime: this.joinTime } })
    }

    async sendUp(textChannel) {
        const guildData = await this.guild.getData()
        if (!guildData.levels.message) return
        if (!this.member) await this.guild.members.fetch(this.userId)

        const channel = guildData.levels.message.messageChannel && textChannel || this.guild.channels.cache.get(guildData.levels.message.channel)
        if (!channel || !channel.permissionsFor(this.guild.me).has([ 'VIEW_CHANNEL', 'SEND_MESSAGES' ])) {
            if (channel?.id === guildData.levels.message.channel) {
                guildData.update({ $set: { 'levels.message': null } })
            } else {
                this.sendUp()
            }

            return
        }
        
        const payload = {
            allowedMentions: { parse: ['users', 'roles', 'everyone'] },
            content: guildData.levels.message.content.parse({ 
                level: this.level,
                guild: { toString: () => this.guild.name, id: this.guild.id }, 
                member: { toString: () => this.member.user.toString(), tag: this.member.user.tag, username: this.member.user.username, id: this.member.user.id, discriminator: this.member.user.discriminator }
            }).slice(0, 2000),
            embeds: []
        }

        if (channel.permissionsFor(this.guild.me).has('EMBED_LINKS')) {
            const roles = guildData.levels.roles.filter(c => c.level === this.level && this.guild.roles.cache.get(c.id))
            if (roles.length) payload.embeds.push(
                new MessageEmbed()
                    .setColor(xee.settings.color)
                    .setTitle('Добавленные роли')
                    .setDescription(new Intl.ListFormat('ru').format(roles.map(role => `<@&${role.id}>`)).slice(0, 4000))
            )
        }

        channel.send(payload).then(message => guildData.levels.message.time && setTimeout(() => message.delete().catch(() => {}), guildData.levels.message.time))
    }

    async fetchRoles() {
        const guildData = await this.guild.getData()
        const levelRoles = guildData.levels.roles
        if (!levelRoles?.length) return
        const roleLevel = Math.max.apply(null, levelRoles.filter(r => r.level <= this.level).map(r => r.level)) || this.level

        const _levelRoles = levelRoles.filter(r => r.level === roleLevel).map(r => r.id)
        if (!this.member) await this.guild.members.fetch(this.userId)

        for (const levelRole of levelRoles) {
            const role = this.guild.roles.cache.get(levelRole.id)
            if (!role?.editable) continue

            if (levelRole.level === roleLevel) await this.member.roles.add(role, `роль за ${this.level} уровень`)
            else if (guildData.levels.oneRole && !_levelRoles.includes(role.id) && this.member.roles.cache.has(role.id)) await this.member.roles.remove(role, `роль за ${levelRole.level} уровень, в то время как сейчас ${this.level}`) 
        }
    }

    /**
     * @returns {import('discord.js').GuildMember}
     */

    get member() {
        return this.guild.members.resolve(this.userId)
    }

    get guild() {
        return xee.client.guilds.cache.get(this.guildId)
    }

    get inVoice() {
        return !!this.voiceChannel
    }

    get cooldown() {
        return this.#cooldown > Date.now()
    }

    static levelToXp(lvl) {
        let res = 0
        for (let level = lvl; level > 0; level--) {
            res += xee.calculateXp(level)
        }
        return res
    }

    static xpMethod(xp, mode = 'level') {
        if (xp instanceof MemberData) xp = xp.xp

        for (let lvl = 1; lvl <= 1000; lvl++) {
            const nextAt = xee.calculateXp(lvl)
            if (nextAt > xp) return mode === 'level' ? lvl - 1 : xp
            else xp -= nextAt
        }

        return 0
    }
}

module.exports = MemberData
