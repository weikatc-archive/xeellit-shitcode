const { findMember } = require('../../client/util')
const { MessageEmbed } = require('discord.js')
module.exports = {
    command: {
        description: 'показывает аватар пользователя',
        aliases: ['ava'], usage: '[@участник]',
        examples: {
            '{{prefix}}avatar': 'отправит Вашу аватарку',
            '{{prefix}}avatar @Minori': 'покажет аватарку пользователя Minori'
        }, permissions: { me: ['EMBED_LINKS'] }
    },
    execute: async function (message, args) {
        const member = args.length && await findMember(message, args.join(' ')) || message.member

        const getEmbed = (f, a) => {
            return new MessageEmbed()
                .setColor(xee.settings.color)
                .setImage(f({ dynamic: true, size: 4096 }))
                .setDescription(
                    [
                        `[[PNG]](${f({ format: 'png', size: 4096 })})`,
                        a && `[[JPEG]](${f({ format: 'jpg', size: 4096 })})`,
                        a && `[[WebP]](${f({ format: 'webp', size: 4096 })})`, 
                        a?.startsWith('a_') && `[[GIF]](${f({ dynamic: 'gif', size: 4096 })})`, 
                    ].filter(Boolean).map(l => `**${l}**`).join(' ')
                )
        }

        const options = {
            embeds: [
                getEmbed(member.user.displayAvatarURL.bind(member.user), member.user.avatar),
                member.avatar && getEmbed(member.avatarURL.bind(member), member.avatar)
            ].filter(Boolean)
        }

        options.embeds[0]
            .setAuthor({ name: member.user.tag })
            .description += member.user.avatar && 
                `\n[[Стандартная аватарка]](${member.user.defaultAvatarURL} \'Аватарка, установленная дискором при регистрации'\)` || 
                '\nУстановлена стандартная аватарка'


        message.channel.send(options)
    }
}
