const { MessageEmbed } = require('discord.js')
module.exports = {
    command: {
        description: 'пригласительная ссылка бота',
        permissions: {
            me: ['EMBED_LINKS']
        }
    },
    execute: async function (message) {
        return message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setFooter(xee.client.user.tag)
                    .setThumbnail(xee.client.user.displayAvatarURL())
                    .setColor(xee.settings.color)
                    .setDescription(`**Пригласить**:\n${[
                        `**[Админ права](https://discord.com/oauth2/authorize?client_id=${xee.client.user.id}&permissions=8&scope=bot)**`,
                        `[Обычные права](https://discord.com/oauth2/authorize?client_id=${xee.client.user.id}&permissions=11264&scope=bot)`
                    ].join('\n')}\n\n**Остальные ссылки**:\n**[Сервер поддержки](${xee.client.options.http.invite}/qqBnjut)**`)
            ]
        })
    }
}