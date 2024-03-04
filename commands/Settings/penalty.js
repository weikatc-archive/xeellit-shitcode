const { MessageEmbed } = require('discord.js')
const { parseDuration } = require('../../client/util')

module.exports = {
    command: {
        description: 'установка наказаний за варны',
        fullDescription: `**Типы наказаний**: \`mute\`, \`ban\`, \`kick\``,
        usage: '<кол-во варнов> <тип> [время?]',
        examples: {
            '{{prefix}}penalty': 'покажет действующие наказания',
            '{{prefix}}penalty 2 mute 10h': 'установит наказание за 2 варна с действием мут на 10 часов',
            '{{prefix}}penalty 4': 'удалит наказание на 4 варна'
        },
        permissions: {
            user: ['MANAGE_GUILD'],
            me: ['EMBED_LINKS']
        }
    },
    execute: async function (message, args, options) {
        const penalty = message.guild.data.penalty
        if (!args.length) return message.channel.send(penalty.length ? {
            embeds: [
                new MessageEmbed()
                    .setColor(xee.settings.color)
                    .setAuthor({ name: 'Наказания за Варны', iconURL: message.guild.iconURL({ size: 2048, dynamic: true }) })
                    .setDescription(penalty.map(p => `Если человек получает **${p.count}** ${xee.constructor.plural(['предупреждение', 'предупреждения', 'предупреждений'], p.count)}, то я **${{
                        ban: 'блокирую его',
                        mute: 'его заглушаю',
                        kick: 'исключаю его с сервера'
                    }[p.type]}**${p.time ? ` на **${xee.constructor.ruMs(parseDuration(p.time))}**` : ''}`).slice(0, 10).join('\n'))
            ]
        } : `Наказания не установлены. Чтобы установить наказание, используй \`${options.prefix}${options.usage} <число-варнов> <тип> [время?]\``)

        const warns = +args[0]
        if (isNaN(warns) || !isFinite(warns)) return message.channel.send('Количество варнов — это число. Ты мне дал непонятно что')
        if (warns > 20) return message.channel.send('Что-то слишком много варнов ты хочешь... Максимум: 20')
        if (warns === 0) return message.channel.send('Ты случаем не попутал 0 с другой цифрой?')
    
        const _penalty = penalty.find(r => r.count === warns)
        if (_penalty) {
            await message.guild.data.update({ $pull: { penalty: { count: warns } } })
            return message.channel.send(`Наказание **${_penalty.type}** за **${xee.constructor.plural(['предупреждения', 'предупреждения', 'предупреждений'], warns, true)}** удалено`)
        }

        if (penalty.length === 10) return message.channel.send('Больше 10 наказаний установить нельзя, сорри')

        const type = args[1]?.toLowerCase()
        if (!type) return message.channel.send('Ты должен указать действие: **ban**, **kick** или **mute**')
        if (!['ban', 'kick', 'mute'].includes(type)) return message.channel.send(`Не думаю, что **${type.slice(0, 10)}** это адекватное действие`)

        let time = null
        if (type === 'mute') {
            if (!args[2]) return message.channel.send('На сколько мут давать? Прости, я уж не знаю')
            if (!parseDuration(args[2])) return message.channel.send('Это не сильно похоже на нормальное время')
            time = args[2]
        } else if (type === 'ban' && args[2]) {
            const _time = parseDuration(args[2])
            if (!_time) return message.channel.send('Неверно указано время бана')
            if (_time < 1e4) return message.channel.send('Минимальное время бана: 10 секунд')
            if (_time > 63115200000) return message.channel.send('Максимальное время бана: 2 года')
            time = args[2]
        }

        await message.guild.data.update({ $push: { penalty: { type, time, count: warns } } })
        return message.channel.send(`Наказание **${{ 
            ban: 'блокировка', mute: 'заглушение', kick: 'исключение' 
        }[type]}** за **${xee.constructor.plural(['предупреждения', 'предупреждения', 'предупреждений'], warns, true)}** установлено`)
    }
}
