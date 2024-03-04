const { MessageEmbed } = require('discord.js')
module.exports = {
    command: {
        description: 'информация о боте',
        aliases: ['stats', 'botinfo'],
        hidden: true,
        permissions: {  me: ['EMBED_LINKS'] }
    },
    execute: async function (message) {
        const [ guilds, channels ] = await Promise.all([
            xee.cluster ? await xee.cluster.eval('xee.client.guilds.cache.size').then(r => r.reduce((a, b) => a + b, 0)).catch(() => 0) : xee.client.guilds.cache.size,
            xee.cluster ? await xee.cluster.eval('xee.client.channels.cache.size').then(r => r.reduce((a, b) => a + b, 0)).catch(() => 0) : xee.client.channels.cache.size
        ])

        const start = Date.now()
        const pinging = await message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setAuthor({ name: `${xee.client.user.username}: ${xee.version}`, iconURL: xee.client.user.displayAvatarURL() })
                    .setColor(xee.settings.color)
                    .setDescription(`Время работы: **${xee.constructor.ruMs(xee.client.uptime)}**`)
                    .setFields([
                        {
                            name: 'Информация',
                            value: `WebSocket: \`${xee.client.ws.ping}ms\`\nAPI: \`?ms\`\nОЗУ: \`${Math.floor(process.memoryUsage.rss() / 1024 ** 2)}МБ\` / \`${Math.ceil(require('os').totalmem() / 1024 ** 2)}МБ\``,
                            inline: true
                        },
                        {
                            name: '\u200b',
                            value: `Серверов: \`${guilds.toLocaleString('ru')}\`\nКаналов: \`${channels.toLocaleString('ru')}\``,
                            inline: true
                        },
                        {
                            name: 'Ссылки',
                            value: `[Сервер поддержки](${xee.client.options.http.invite}/qqBnjut)`
                        }
                    ])
                    .setImage('https://i.pinimg.com/originals/3e/b7/6f/3eb76f3f0200b6c9f471056c25eb8442.jpg')
                    .setFooter({ text: 'Бот создан @oddyamill' })
            ]
        })

        pinging.embeds[0].fields[0].value = pinging.embeds[0].fields[0].value.replace('?ms', `${Date.now() - start}ms`)
        await pinging.edit({ embeds: pinging.embeds })
    }
}