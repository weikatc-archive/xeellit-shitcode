module.exports = {
    async guildDelete(guild) {
        if (!xee.botPublic) return
        const guildData = await guild.getData()

        await guildData.purge()
        console.log(`Я вышел с сервера ${guild.name} ${guild.id}`)
    },
    
    async emojiDelete(emoji) {
        const guild = emoji.guild
        if (!guild || !guild.available || !xee.botPublic) return

        const guildData = await guild.getData()

        if (guildData.reports?.emoji.endsWith(emoji.id)) {
            await guildData.update({ $set: { 'reports.emoji': '%F0%9F%93%A2' } })
        }

        const autoreact = guildData.utils.autoreact
        if (!autoreact.length) return

        guildData.utils.autoreact = []

        for (let element of autoreact) {
            element = Object.assign( {}, element )
            element.emojis = element.emojis.filter(e => e.id !== emoji.id)
            if (element.emojis) guildData.utils.autoreact.push(element)
        }

        return JSON.stringify(autoreact) !== JSON.stringify(guildData.utils.autoreact) && 
            guildData.update({ $set: { 'utils.autoreact': guildData.utils.autoreact } })
    },

    async channelDelete(channel) {
        if (channel.type === 'GUILD_CATEGORY' || channel.type === 'DM' || !xee.botPublic) return
        const guildData = await channel.guild.getData()
        const query = { $set: {}, $pull: {} }

        if (guildData.welcome?.channel === channel.id) query.$set.welcome = null
        if (guildData.goodbye?.channel === channel.id) query.$set.goodbye = null
        if (guildData.starboard?.channel === channel.id) query.$set.starboard = null
        if (guildData.logs === channel.id) query.$set.logs = null

        const interserver = xee.store.interservers.find(i => i.channels.includes(channel.id))
        if (interserver) interserver.deleteChannel(channel.id)

        const rooms = guildData.rooms?.find(rc => rc.channel === channel.id)
        if (rooms) query.$pull.rooms = { channel: channel.id }

        const autoreact = guildData.utils.autoreact.find(ar => ar.channel === channel.id)
        if (autoreact) query.$pull.autoreact = { channel: channel.id }

        if (guildData.modLogs) {
            xee.db.collection('cases').updateMany({ guild: channel.guild.id }, { $unset: { messageId: '' } })
            query.$set.modLogs = null
        }

        if (guildData.levels) {
            if (guildData.levels.ignore?.includes(channel.id)) query.$pull['levels.ignore'] = channel.id
            if (guildData.levels.message?.channel === channel.id) query.$set['levels.message'] = {}
        }

        if (xee.store.polls.some(poll => poll.channelId === channel.id)) {
            xee.store.polls.filter(poll => poll.channelId === channel.id).forEach(poll => {
                clearTimeout(poll.timeout)
                xee.store.polls.delete(poll.id)
            })
            xee.db.collection('polls').deleteMany({ channelId: channel.id })
        }

        if (xee.store.reactroles.some(rr => rr.channel === channel.id))
            xee.db.collection('reactroles').deleteMany({ channel: channel.id })

        
        Object.entries(query).filter(([, a]) => !Object.keys(a).length)
            .forEach(([name]) => delete query[name])

        if (Object.keys(query).length) guildData.update(query)
    },

    async roleDelete(role) {
        const guildData = await role.guild.getData()
        const query = { $set: {} }

        if (guildData.modRole === role.id) query['$set'].modRole = null
        if (guildData.autoRole === role.id) query['$set'].autoRole = null
        if (guildData.levels?.roles?.length && 
            guildData.levels.roles.some(r => r.id === role.id)) query['$set']['levels.roles'] = 
                                             guildData.levels.roles.filter(r => r.id !== role.id)

        if (guildData.utils.muterole === role.id) {
            if (role.guild.members.me.permissions.has('MANAGE_ROLES') && guildData.mutes.size) {
                const muteRole = await role.guild.roles.create({
                    name: role.name, 
                    color: role.color, 
                    permissions: role.permissions, 
                    mentionable: role.mentionable,
                    reason: 'роль для загрушенных пользователей была удалена'
                })

                query['$set']['utils.muterole'] = muteRole.id

                if (muteRole.editable) guildData.mutes.filter(mute => mute.member)
                    .forEach(mute => mute.member.roles.add(muteRole))
            } else query['$set']['utils.muterole'] = null
        }

        if (xee.store.reactroles.some(rr => rr.role === role.id))
            xee.db.collection('reactroles').deleteMany({ role: role.id })

        return Object.keys(query['$set']).length && guildData.update(query)
    }
}