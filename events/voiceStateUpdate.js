const cooldown = new Set
module.exports = {
    execute: async function (oldState, newState, promiseResolve = () => {}) {
        const guild = oldState.guild || newState.guild
        const member = oldState.member || newState.member
        const guildData = await guild.getData()

        if (promiseResolve.length || !guildData.rooms?.length) return
        if (oldState.channelId && (oldState.channelId && !newState.channelId || oldState.channelId !== newState.channelId)) {
            if (xee.store.rooms.includes(oldState.channelId)) {
                const room = await xee.db.collection('rooms').findOne({ channel: oldState.channelId })
                if (!room) return

                if (room.ownerDependence) {
                    if (member.user.id === room.user) oldState.channel?.delete()
                        ?.catch(console.log)
                        ?.then(() => xee.db.collection('rooms').deleteOne({ user: member.user.id }))
                } else {
                    if (!oldState.channel?.members?.size) oldState.channel?.delete()
                        ?.catch(console.log)
                        ?.then(() => xee.db.collection('rooms').deleteOne({ channel: oldState.channelId }))
                }
            }

            if (oldState.channelId === xee.store.rooms[member.user.id]) 
                return oldState.channel?.delete()
                    ?.catch(console.log)
                    ?.then(() => xee.db.collection('rooms').deleteOne({ user: member.user.id }))
        }

        if (newState.channelId && (!oldState.channelId && newState.channelId || oldState.channelId !== newState.channelId)) {
            const roomCreator = guildData.rooms.find(rc => rc.channel === newState.channelId)
            if (!roomCreator || !guild.members.me.permissions.has('MANAGE_CHANNELS')) return
            if (cooldown.has(member.user.id)) return newState.channel.permissionsFor(guild.me).has('MOVE_MEMBERS') && newState.disconnect().catch(() => null)

            const createOptions = {
                name: roomCreator.name.parse({
                    member: { toString: () => member.displayName, tag: member.user.tag, username: member.user.username }
                }).slice(0, 98),
                userLimit: roomCreator.userLimit,
                reason: `создатель комнат на канале ${roomCreator.channel}`,
                type: 'GUILD_VOICE', 
                position: null
            }

            if (!newState.channel) newState.channel = await xee.client.channels.fetch(newState.channelId)
            if (guild.channels.cache.has(roomCreator.parent)) createOptions.parent = roomCreator.parent
            else if (newState.channel?.parent) createOptions.parent = newState.channel.parentId

            return newState.channel.clone(createOptions).then(async channel => {
                if (roomCreator.permissions) channel.permissionOverwrites.upsert(member.user, { 
                    MANAGE_CHANNELS: true, MOVE_MEMBERS: true 
                })

                cooldown.add(member.user.id)
                setTimeout(() => cooldown.delete(member.user.id), 15000)

                await oldState.setChannel(channel)
                    .catch(() => channel.delete().catch(() => null))

                xee.store.rooms.push(channel.id)
                return xee.db.collection('rooms').insertOne({
                    ownerDependence: !!roomCreator.ownerDependence,
                    guild: guild.id,
                    user: member.user.id,
                    channel: channel.id,
                    date: Date.now()
                })
            }).catch(() => null)
        }
    }
}
