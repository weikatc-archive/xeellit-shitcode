const Mute = require('../classes/Mute')
const Interserver = require('../classes/Interserver')
const Poll = require('../classes/Poll')
const Giveaway = require('../classes/Giveaway')

const GuildData = require('../classes/GuildData')
const MemberData = require('../classes/MemberData')

module.exports = {
    execute: async function () {
        console.log(xee.client.shard ? `Бот ${xee.client.user.tag} загружен на ${xee.client.shard.ids[0]} шарде.` : `Бот ${xee.client.user.tag} появился на лужайке.`)
        
        const guilds = await xee.db.collection('guilds').find().toArray()

        guilds.filter(guild => xee.client.guilds.cache.has(guild.id)).forEach(async rawData => {
            const guildData = new GuildData(rawData.id, rawData)
            const guild = guildData.guild

            // guildData.starboard?.messages
            //     ?.filter(m => guild.channels.cache.get(m.channel)?.permissionsFor(guild.me)?.has([ 'READ_MESSAGE_HISTORY', 'VIEW_CHANNEL' ]))
            //     ?.forEach(message => guild.channels.cache.get(message.channel).messages.fetch(message.message).catch(() => null))


            if (guildData.levels) {
                const inVoice = await xee.db.collection('members').find({ voiceChannel: { $nin: [ null, '' ] }, guild: guild.id }).toArray()
                await Promise.all(
                    inVoice.map(async member => {
                        new MemberData(member)
                        await guild.members.fetch(member.user) 
                    })
                )

                const fetchedChannels = []
                const fetchedUsers = []

                for (const channel of guild.channels.cache.filter(c => c.type === 'GUILD_VOICE' && c.members?.size).values()) {
                    for (const member of channel.members.values()) {
                        fetchedUsers.push(member.id)

                        if (inVoice.some(user => user.user === member.id)) continue
                        if (fetchedChannels.includes(member.voice.channelId)) continue
                        fetchedChannels.push(member.voice.channelId)

                        const voiceState = member.voice._clone()
                        voiceState.channelId = null

                        xee.client.emit('voiceStateUpdate', voiceState, member.voice, Promise.resolve)
                    }
                }

                inVoice.filter(u => !fetchedUsers.includes(u.user)).forEach(user => {
                    const userData = guild.members.cache.get(user.user)?.data
                    if (!userData) return

                    userData.calculateVoiceTime()

                    const voiceChannel = guild.channels.cache.get(user.voiceChannel)
                    if (!voiceChannel || !voiceChannel.members.size) return

                    const voiceMembers = voiceChannel.members.filter(member => !member.voice.mute && !member.user?.bot)
                    if (voiceMembers.size === 1) voiceMembers.first().getData().then(memberData => memberData.inVoice && memberData.calculateVoiceTime())
                })
            }
        })

        const [ interservers, rooms, mutes, polls, giveaways, reactroles ] = await Promise.all([
            xee.db.collection('interservers').find().toArray(),
            xee.db.collection('rooms').find().toArray(),
            xee.db.collection('mutes').find({ guild: { $in: xee.client.guilds.cache.map(guild => guild.id) } }).toArray(),
            xee.db.collection('polls').find().toArray(),
            xee.db.collection('giveaways').find().toArray(),
            xee.db.collection('reactroles').find({ guild: { $in: xee.client.guilds.cache.map(guild => guild.id) } }).toArray(),
            xee.db.collection('starboards').find({ guild: { $in: xee.client.guilds.cache.map(guild => guild.id) } }).toArray()
        ])
            

        interservers.forEach(interserver => new Interserver(interserver))
        rooms.forEach(room => xee.client.channels.cache.has(room.channel) && xee.store.rooms.push(room.channel))
        mutes.forEach(mute => new Mute(xee.client.guilds.cache.get(mute.guild), mute).setTimeout())
        polls.filter(poll => xee.client.channels.cache.has(poll.channel)).forEach(poll => new Poll(poll).load())
        giveaways.filter(giveaway => xee.client.guilds.cache.has(giveaway.guild)).forEach(giveaway => new Giveaway(giveaway).setTimeout())

        reactroles.forEach(reactRole => {
            const channel = xee.client.channels.cache.get(reactRole.channel)
            if (!channel) return

            return xee.store.reactroles.set(reactRole._id, reactRole)
        })

        if ('DYNO' in process.env) xee.commands.delete('reload')
        if (!xee.rest.kaneki.default.headers.authorization) ['remind', 'reminds', 'filter'].forEach(xee.commands.delete.bind(xee.commands))

        const application = await xee.client.application.fetch()
        if (application.owner.name) xee.settings.owners.push(...application.owner.members.map(member => member.user.id))
        else xee.settings.owners.push(application.owner.id)

        xee.botPublic = application.botPublic
    },
}