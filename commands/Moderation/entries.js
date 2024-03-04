const { findMember, chunk, parseDuration, formatDate } = require('../../client/util')

const Confirmation = require('../../classes/Confirmation')
const Pagination = require('../../classes/Pagination')
const { MessageEmbed } = require('discord.js')

const names = {
    ban: 'Блокировка',
    kick: 'Исключение',
    mute: 'Заглушение',
    warn: 'Предупреждение',
    unmute: 'Снятие загрушения',
    rewarn: 'Снятие предупреждения',
    unban: 'Снятие блокировки',
    muteTime: 'Продление загрушения'
}

module.exports = {
    command: {
        aliases: ['cases'],
        description: 'история нарушений',
        usage: '[@юзер | reset [@юзер]]',
        examples: {
            '{{prefix}}entries': 'откроет вашу историю нарушений',
            '{{prefix}}entries @MrModer': 'покажет историю нарушений MrModer'
        },
        permissions: { me: ['EMBED_LINKS'] }
    },
    execute: async function(message, args) {
        if (message.member.permissions.has('MANAGE_GUILD') && args[0]?.toLowerCase() === 'reset') {
            if (!await xee.db.collection('cases').countDocuments({ guild: message.guild.id })) return message.channel.send('Записей в базе нет...')
            if (args.length > 1) {
                const member = await findMember(message, args.slice(1).join(' '))
                if (!member) return message.channel.send('Укажите пользователя на этом сервере.')


                if (!await xee.db.collection('cases').countDocuments({ 
                    guild: message.guild.id, 
                    user: member.id 
                })) return message.channel.send(`У **${member.user.tag}** нет истории наказаний.`)

                const data = await (new Confirmation(message).setContent(`Вы хотите удалить все улики нарушений у пользователя **${member.user.tag}**?`)).awaitResponse()
                if (!data.data) return data.delete()

                await xee.db.collection('cases').deleteMany({
                    guild: message.guild.id,
                    user: member.id
                })

                return data.reply(`Список нарушений пользователя **${member.user.tag}** был очищен`)
            }

            const data = await (new Confirmation(message).setContent(`Вы хотите удалить все записи нарушений сервера?`).awaitResponse())
            if (!data.data) return data.delete()
            
            await xee.db.collection('cases').deleteMany({ guild: message.guild.id })
            return data.reply('Все записи сервера были удалены.')
        }

        let member = message.member

        if (args.length) member = await findMember(message, args.join(' '))
        if (!member) return message.channel.send('Пользователь не найден... =(')

        const userCases = await message.guild.data.entries.fetch(member)
        if (!userCases.length) return message.channel.send('Истории нету. Почему? Знать не мне.')

        const interface = new Pagination(message.author)

        chunk(userCases, 6).forEach((entries, index, self) => 
            interface.add({
                embeds: [
                    new MessageEmbed()
                        .setColor(xee.settings.color)
                        .setTitle(`История наказаний ${member.user.tag}`)
                        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                        .addFields(entries.map(e => ({
                            name: names[e.type],
                            value: `- Причина: **${e.reason?.toLowerCase() || 'отсутствует'}**${e.time ? `\n- Длительность: **${xee.constructor.ruMs(e.time)}**` : ''}\n- Дата: **${formatDate(e.date, 'd')}**${e.penalty ? `\n- Наказание: **${{ ban: 'блокировка', kick: 'исключение', mute: 'заглушение' }[e.penalty.type]}**${e.penalty.time ? ` на **${xee.constructor.ruMs(parseDuration(e.penalty.time))}**` : ''}` : ''}`.slice(0, 512)
                        }))).setFooter(`Страница: ${index + 1} из ${self.length}`)
                ]
            })
        )


        return interface.send(message.channel)
    }
}
