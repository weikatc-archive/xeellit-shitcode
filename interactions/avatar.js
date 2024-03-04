const { MessageEmbed } = require('discord.js')

module.exports = {
    config: {
        name: 'avatar',
        description: 'Показывает аватар пользователя',
        options: [{
            name: 'пользователь',
            description: 'Укажите пользователя, чтобы посмотреть на его аватарку',
            type: 6,
        }, {
            name: 'скрытно',
            description: 'Отправлять ли аватар в чат',
            type: 5
        }]
    },

    async execute(interaction) {
        const user = interaction.options.get('пользователь')?.user || interaction.user
        const ephemeral = interaction.options.get('скрытно')?.value ?? false

        return interaction.reply({
            ephemeral,
            content: `Аватар пользователя **${user.tag}**:`,
            embeds: [
                new MessageEmbed()
                    .setColor(xee.settings.color)
                    .setImage(user.displayAvatarURL({ dynamic: true, size: 4096 }))
                    .setDescription([
                        `[[PNG]](${user.displayAvatarURL({ format: 'png', size: 4096 })})`,
                        user.avatar && `[[JPEG]](${user.displayAvatarURL({ format: 'jpg', size: 4096 })})`,
                        user.avatar && `[[WebP]](${user.displayAvatarURL({ format: 'webp', size: 4096 })})`,
                        user.avatar?.startsWith('a_') && `[[GIF]](${user.displayAvatarURL({ dynamic: true, format: 'gif', size: 4096 })})`
                    ].filter(Boolean).map(l => `**${l}**`).join(' ') + (user.avatar && `\n[[Стандартная аватарка]](${user.defaultAvatarURL} \'Аватарка, установленная дискором при регистрации'\)` || '\nУстановлена стандартная аватарка'))
            ]
        })
    }
}