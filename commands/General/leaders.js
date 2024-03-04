const { MessageEmbed } = require('discord.js')
const MemberData = require('../../classes/MemberData')

module.exports = {
    command: {
        aliases: ['top', 'leaderboard', 'lb'],
        description: 'таблица лидеров сервера',
        usage: '[страница]',
        permissions: {
            me: ['EMBED_LINKS']
        }
    },
    execute: async function (message, args, options) {
        if (!message.guild.data.levels) return message.channel.send(`Система уровней на сервере отключена. Смирись с этим${message.member.permissions.has('MANAGE_GUILD') ? ` или просто включи её (\`${options.prefix}levels\`)` : ''}.`)

        let page = +args.shift()
        if (isNaN(page) || !isFinite(page)) page = 1


        const memberData = await message.member.getData()

        const [ count, top, userPosition ] = await Promise.all([
            xee.db.collection('members').countDocuments({ guild: message.guild.id }).then(res => Math.ceil(res / 10)),
            xee.db.collection('members').find({ guild: message.guild.id }).sort({ xp: -1 }).skip(10 * (page - 1)).limit(10).toArray(),
            xee.db.collection('members').countDocuments({ guild: message.guild.id, xp: { $gt: memberData.totalXp - 1 } })
        ])

        if (!count) return message.channel.send('Доска пуста, приходи попозже.')
        if (page > count) return message.channel.send(`Максимальная страница доски: \`${count}\`...`)

        await Promise.all(top.map(u => xee.client.users.fetch(u.user)))

        const embed = new MessageEmbed()
            .setColor(xee.settings.color)
            .setAuthor({ name: 'Доска лидеров', iconURL: message.guild.iconURL() })
            .setDescription('')
            .setFooter(`Страница: ${page} / ${count}`)

        for (const _user in top) {
            const user = top[_user]
            const userTag = await xee.client.users.fetch(user.user).then(res => res.tag)
            embed.description += `\n\`#${+_user + 1 + (page - 1) * 10}\`: **${userTag}** — на **${MemberData.xpMethod(user.xp, 'level')} уровне**, имеет **${MemberData.xpMethod(user.xp, 'xp')} опыта** (всего **${user.xp}**)`
        }

        if (!top.some(i => i.user === message.author.id)) 
            embed.description += '\n' + '-'.repeat(embed.description.split('\n').pop().length) + 
                `\n\`#${userPosition}\`: **${message.author.tag}** — на **${memberData.level} уровне**, имеет **${memberData.xp} опыта** (всего **${memberData.totalXp}**)`

        return message.channel.send({ embeds: [embed] })
    }
}