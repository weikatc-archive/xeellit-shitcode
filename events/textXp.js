module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return

        const guildData = await message.guild.getData()
        if (guildData.levels && !guildData.levels.ignore?.includes(message.channel.id)) {
            const messageXp = message.guild.data.levels.messageXp
            const memberData = await message.member.getData()
            memberData.messages++
            
            if (!memberData.cooldown) {
                memberData.addXp(Math.floor(messageXp[1] ? xee.randomInt(...messageXp) : messageXp[0]), message)
            }
        }

        const mute = guildData.mutes.find(mute => mute.memberId === message.author.id)
        if (mute && !message.member.roles.cache.has(guildData.utils.muterole) && message.guild.members.me.permissions.has('MANAGE_ROLES')) {
            const role = message.guild.roles.cache.get(guildData.utils.muterole)
            if (role && role.editable) await message.member.roles.add(role).catch(() => {})
        }
    }
}
