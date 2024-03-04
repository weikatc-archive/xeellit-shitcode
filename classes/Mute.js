class Mute {
    #timeout
    constructor(guild, data) {
        this.guild = guild

        this.id = data.id || data._id
        this.guildId = data.guild || guild?.id
        this.memberId = data.member

        this.time = data.time || data.end
        this.reason = data.reason || null
        this.roles = Array.isArray(data.roles) && [...new Set(data.roles)] || []

        xee.store.mutes.set(this.id, this)
    }

    setTimeout() {
        if (this.remain < 99360000) {
            this.#timeout = setTimeout(this.clearMute.bind(this), this.remain)
        }

        return this
    }

    clearTimeout() {
        clearTimeout(this.#timeout)
    }

    async clearMute(moderator) {
        await this.purge()
        this.clearTimeout()

        const member = this.member || await this.guild.members.fetch(this.memberId).catch(() => null)
        if (member && this.guild.members.me.permissions.has('MANAGE_ROLES')) {
            const reason = moderator ? `снятие мута модератором [${moderator.user.tag}]` : 'автоматическое снятие мута'
            const guildData = await this.guild.getData()
            const muteRole = guildData.muteRole

            await member.roles.add(this.roles.filter(role => this.guild.roles.cache.get(role)?.editable), reason)
            if (muteRole?.editable) await member.roles.remove(muteRole, reason)
        }
    }

    async save() {
        await xee.db.collection('mutes').insertOne({
            id: this.id,
            guild: this.guildId,
            member: this.memberId,
            reason: this.reason,
            roles: this.roles,
            time: this.time
        })
        return this
    }

    async purge() {
        xee.store.mutes.delete(this.id)
        await xee.db.collection('mutes').deleteOne({
            guild: this.guildId,
            member: this.memberId
        })
    }

    get remain() {
        return this.time - Date.now()
    }

    get member() {
        return this.guild?.members.cache.get(this.memberId)
    }
}

module.exports = Mute
