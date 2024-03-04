const { findMember, isMod } = require('../../client/util')
const Confirmation = require('../../classes/Confirmation')

module.exports = {
    command: {
        description: 'кикает участника с сервера',
        usage: '<@юзер> [причина]',
        aliases: ['k'],
        flags: ['force'],
        examples: {
            '{{prefix}}kick @unreal': 'кикнет пользователя **@unreal**'
        },
        permissions: {
            me: ['KICK_MEMBERS']
        }
    },
    execute: async function (message, args, options) {
        if (!isMod(message, 'KICK_MEMBERS')) return message.channel.send('Но ведь ты даже не модератор...')
        if (!args.length) return message.channel.send(xee.commands.help('kick', options.prefix))

        const member = await findMember(message, args.shift())
        if (!member) return message.channel.send(`Нужно указать пользователя с сервера, блин.`)
        if (member.id === message.author.id) return message.channel.send(
            member.id === message.guild.ownerId ? 
                'Вам показать, как передать права на сервер и нажать на красную кнопку "Покинуть сервер"?' : 
                'Есть красная кнопка "Покинуть сервер". Нажмите на неё.'
        )

        if (member.id === message.guild.ownerId) return message.channel.send('Ты не сможешь кикнуть овнера. А он тебя может :))')
        if (!member.kickable) return message.channel.send(`Я не смогу кикнуть того, кто выше меня по ролям. А имя ему — **${member.user.tag}**!`)

        if (!options.warn && message.author.id !== message.guild.ownerId) {
            if (isMod(message, 'KICK_MEMBERS', member) && (
                message.member.permissions.has('ADMINISTRATOR') ? 
                    member.permissions.has('ADMINISTRATOR')
                : true
            )) return message.channel.send('Модераторов нельзя исключать с сервера. В отличии от тебя — они не занимаются такой бессмыслицей.')
            if (!(message.member.roles.highest.comparePositionTo(member.roles.highest) > 0)) return message.channel.send(`Ваша высшая роль должна быть выше, чем у **${member.user.tag}**.`)
        }

        const reason = args.join(' ')
        const data = await (new Confirmation(message).setContent(`Вы точно хотите выгнать **${member.user.tag}**${reason ? ` по причине \`${reason.slice(0, 100)}\`` : ''}?`).awaitResponse())
        if (data.data === false) return data.reply('Действие отменено. Но только почему?')

        return member.kick(`${reason?.slice(0, 509 - message.author.tag.length)} [${message.author.tag}]`)
            .then(() => data.reply(options.message || `Участник **${member.user.tag}** был кикнут с сервера. Как думаете, вернётся или нет?\n${reason ? `Причина: \`${reason.slice(0, 600)}\`` : ''}`) && 
                        !options.warn && message.guild.data.entries.createCase('kick', member, message.member, { reason }))
            .catch(() => data.reply('Там, где заканчивается полоса неудач, начинается территория кладбища'))
    }
}