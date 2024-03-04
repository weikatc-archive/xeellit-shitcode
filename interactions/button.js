const { MessageActionRow, MessageButton } = require('discord.js')

module.exports = {
    config: {
        name: 'button',
        description: 'Кнопка !',
    },

    async execute(interaction) {
        await interaction.reply({
            content: 'Кнопачки',
            components: [
                new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId('button')
                            .setLabel('Кнопачка')
                            .setStyle('PRIMARY')
                    )
            ]
        })

        const colleted = await interaction.channel.awaitMessageComponent({
            filter: () => true,
            time: 120000
        })

        colleted.message.components[0].components[0].setDisabled()
        await colleted.deferUpdate()
        
        interaction.editReply({
            content: colleted.message.content + `: ${colleted.user.tag}`,
            components: colleted.message.components
        })
    }
}