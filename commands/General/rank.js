const { findMember, normalizeNumber } = require('../../client/util')

module.exports = {
    command: {
        usage: '[@пользователь]',
        description: 'сгенерирует карточку ранга',
        aliases: ['r'],
        cooldown: 15,
        permissions: {
            me: ['ATTACH_FILES']
        }
    },
    execute: async function (message, args, options) {
        if (!message.guild.data.levels) return message.channel.send(`Система уровней на сервере отключена. Смирись с этим${message.member.permissions.has('MANAGE_GUILD') ? ` или просто включи её (\`${options.prefix}levels\`)` : ''}.`)

        const member = args.length && await findMember(message, args.join(' ')) || message.member
        const memberData = !member.user.bot ? await member.getData() : {}
        const next = memberData && memberData.level !== 999 && xee.calculateXp(memberData.level + 1) || 0

        if (member.voice?.channel?.type === 'GUILD_VOICE' && member.voice.channelId !== message.guild.afkChannelId) {
            const voiceMembers = member.voice.channel.members.filter(_member => !_member.voice?.mute && _member.id !== member.id && !_member.user.bot)
            if (voiceMembers.size) await memberData.calculateVoiceTime(false) 
        }

        return xee.rest.kaneki.api.rank.post({
            stream: true,
            json: {
                    avatar: member.user.displayAvatarURL({ size: 256, format: 'png' }),
                    username: member.user.username,
                    tag: member.user.discriminator,
                    backgroundImage: memberData.background,
                    level: memberData.level ?? 0, xp: memberData.xp ?? 0, next, 
                    lineColor: message.guild.data.levels.lineColor,
                    position: member.user.bot ? 0 : await xee.db.collection('members').countDocuments({ guild: message.guild.id, xp: { $gt: memberData.totalXp - 1 } }).then(res => res ? res : ++res),
                    voiceTime: this.formatTime(member.user.bot ? 0 : memberData.voiceTime), messages: normalizeNumber(memberData.messages, 2) ?? 0,
            }
        }).then(stream => stream.statusCode === 200 && message.channel.send({ files: [{ attachment: stream, name: 'rank.png' }] }) || message.channel.send('При генерации "красивой" ранговой карточки возникла ошибка'))
          .finally(() => this.cooldowns?.delete(message.author.id))
    },
    formatTime: function(ms) {
        return [
            Math.floor(ms / 3600000),
            Math.floor(ms / 60000) % 60,
            Math.floor(ms / 1000) % 60
        ].map(c => c.toString().padStart(2, '0')).join(':')
    }
}
