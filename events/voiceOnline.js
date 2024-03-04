module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        const guild = oldState?.guild || newState.guild
        const guildData = await guild.getData()

        if (!guildData.levels) return

        const channel = await guild.channels.fetch(oldState.channelId || newState.channelId)
        const member = oldState.member || newState.member || await guild.members.fetch(oldState.id || newState.id)

        if (member?.user.bot) return
        if (channel?.id === guild.afkChannelId) return

        const memberData = await member.getData()
        const channelMembers = channel.members && channel.members.filter(_member => !_member.voice?.mute && _member.id !== member.id && !_member.user.bot)

        if (!channelMembers) return
        if (oldState.channelId && !newState.channelId || !oldState.mute && newState.mute) {
            if (channelMembers.size) memberData.calculateVoiceTime(true)
            if (channelMembers.size < 2) channelMembers.forEach(member => {
                member.getData().then(res => res.calculateVoiceTime(true))
            })
        } else if (oldState.channelId !== newState.channelId || oldState.mute && !newState.mute) {
            if (oldState.channelId && oldState.mute === newState.mute) {
                const clone = oldState._clone()
                clone.channelId = null

                await this.execute('voiceStateUpdate', oldState, clone)
                await this.execute('voiceStateUpdate', clone, newState)
            } else if (!newState.mute && channelMembers.size >= 1) {
                memberData.startVoice(channel.id)
                channelMembers.forEach(async member => {
                    const memberData = await member.getData()
                    if (!memberData.inVoice) memberData.startVoice(channel.id)
                })
            }
        }
    }
}