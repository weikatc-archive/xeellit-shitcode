const { findMember, isMod } = require('../../client/util')
const Confirmation = require('../../classes/Confirmation')

module.exports = {
    command: {
        description: 'снимает варны у юзера',
        usage: '<@юзер> [причина]',
        examples: {
            '{{prefix}}rewarn 770637589253193768': 'удалит все предупреждения у 770637589253193768',
            '{{prefix}}rewarn 477733320583544838 1': 'удалит предупреждение у 477733320583544838 под номерм 1'
        }
    },
    execute: async function (message, args, options) {
        if (!isMod(message, 'MANAGE_MESSAGES')) return message.channel.send('Не получится. :clown:')
        if (!args.length) return message.channel.send(xee.commands.help('rewarn', options.prefix))
        
        const member = await findMember(message, args.join(' '))
        if (!member) return message.channel.send(`Пользователь **${args.join(' ')}** не найден`)
        if (member.id === message.author.id) return message.channel.send('Но ведь это ты')

        const memberWarns = await xee.db.collection('warns').find({ guild: message.guild.id, user: member.id }).toArray()
        if (!memberWarns.length) return message.channel.send(`У **${member.user.tag}** нету варнов. Видно, он крутой. Или нет...`)

        if (!args[1]) {
            if (!(await (
                new Confirmation(message)
                    .setContent(`Ты точно хочешь снять все варны с **${member.user.tag}**?`)
                    .awaitResponse(true))
                )) return message.channel.send('Не хочешь — как хочешь')

            await xee.db.collection('warns').deleteMany({ guild: message.guild.id, user: member.id })
            return message.channel.send(`У **${member.user.tag}** были обнулены варны. Надеюсь, повторного обнуления не будет`)
        }

        const warnId = +args[1]
        if (isNaN(warnId) || !isFinite(warnId)) return message.channel.send('Ты должен был указать **номер варна**, а **номер** это **число**')
        if (warnId === 0) return message.channel.send('Ещё что придумаешь?')

        const memberWarn = memberWarns[warnId - 1]
        if (!memberWarn) return message.channel.send(`Варна с номером **${warnId}** нет`)

        await Promise.all([
            xee.db.collection('warns').deleteOne({ _id: memberWarn._id }),
            message.guild.data.entries.createCase('rewarn', member, message.member, {
                reason: args.slice(1).join(' ')
            })
        ])

        return message.channel.send(`Варн под номером **${warnId}** у пользователя **${member.user.tag}** снят`)
    }
}