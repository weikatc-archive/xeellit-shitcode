module.exports = {
    async guildMemberAdd(member) {
        const guildData = await member.guild.getData()
        if (!(guildData.mutes.size || guildData.autoRole || guildData.welcome?.channel)) return

        const isMuted = xee.store.mutes.some(mute => mute.memberId === member.id && mute.guildId === member.guild.id)
        if (isMuted) {
            const muteRole = guildData.muteRole
            if (muteRole?.editable) member.roles.add(muteRole)
        }

        const autorole = member.guild.roles.cache.get(guildData.autoRole)
        if (autorole?.editable && (isMuted ? !guildData.autoHardMute : true)) member.roles.add(autorole).catch(() => null)

        const welcome = member.guild.channels.cache.get(guildData.welcome?.channel)
        if (welcome && welcome.permissionsFor(member.guild.me).has([ 'SEND_MESSAGES', 'VIEW_CHANNEL' ])) {
            welcome.send({ content: guildData.welcome.message.parse({ 
                guild: { toString: () => member.guild.name, id: member.guild.id }, 
                member: { toString: () => member.user.toString(), tag: member.user.tag, username: member.user.username, id: member.user.id, discriminator: member.user.discriminator,
                    createdAt: member.user.createdAt.toLocaleString('ru', {timeZone: 'Europe/Moscow'}), 
                    createdTime: xee.constructor.ruMs(Date.now() - member.user.createdAt) 
                } 
            }).slice(0, 2000), allowedMentions: { parse: ['users', 'roles', 'everyone'] } })
        }
    },

    async guildMemberRemove(member) {
        const guildData = await member.guild.getData()

        if (guildData.levels) {
            xee.db.collection('members').deleteOne({ user: member.id, guild: member.guild.id })
        }

        const goodbye = member.guild.channels.cache.get(guildData.goodbye?.channel)
        if (goodbye && goodbye.permissionsFor(member.guild.me).has([ 'SEND_MESSAGES', 'VIEW_CHANNEL' ])) {
            if (member.user.partial) await member.user.fetch()

            return goodbye.send(guildData.goodbye.message.parse({
                guild: { toString: () => member.guild.name, id: member.guild.id },
                member: { toString: () => member.user.toString(), tag: member.user.tag, username: member.user.username, id: member.user.id, discriminator: member.user.discriminator, 
                    joinedAt: member.joinedAt?.toLocaleString('ru', { timeZone: 'Europe/Moscow' }) || '?', joinedTime: member.joinedTimestamp ? xee.constructor.ruMs(Date.now() - member?.joinedTimestamp) : '?', 
                    createdAt: member.user.createdAt.toLocaleString('ru', { timeZone: 'Europe/Moscow' }), createdTime: xee.constructor.ruMs(Date.now() - member.user.createdTimestamp)
                },
            }).slice(0, 2000), { allowedMentions: { parse: ['users', 'roles', 'everyone'] }})
        }
    },

    async guildMemberUpdate(_, member) {
        if (xee.store.mutes.some(mute => mute.memberId === member.id && mute.guildId === member.guild.id)) {
            const guildData = await member.guild.getData()
            if (!guildData.muteRole?.editable) return

            if (member.partial) await member.fetch()
            if (!member.roles.cache.has(guildData.muteRole.id)) {
                member.roles.add(guildData.muteRole, 'возврат роли мута')
            }
        }
    }
}
