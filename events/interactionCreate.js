module.exports = {
    execute: async function (interaction) {
        if (interaction.type === 'MESSAGE_COMPONENT') {
            const splitted = interaction.customId?.split(':')
            if (splitted?.length !== 3) return

            await interaction.deferUpdate()
            if (!interaction.guild?.available) return

            const command = xee.commands.get('booru')
            const message = interaction.message._clone()
            message.author = interaction.user

            if (command.cooldowns?.has(interaction.user.id)) {
                return
            }

            return xee.commands.get('booru').execute(message, [
                'gelbooru',
                splitted.pop()
            ], {})
        }

        if (interaction.type !== 'APPLICATION_COMMAND') return

        const command = xee.interactions.get(interaction.commandName) || xee.interactions.find(i => i.aliases?.includes(interaction.commandName))
        if (!command) return

        if (command.cooldown) {
            if (!command.cooldowns) command.cooldowns = new Set()
            if (command.cooldowns.has(interaction.user.id)) return interaction.reply({
                content: 'Попробуйте выполнить эту команду чуть позже...',
                ephemeral: true
            })

            command.cooldowns.add(interaction.user.id)
            setTimeout(() => command.cooldowns.delete(interaction.user.id), command.cooldown * 1000)
        }

        if (command.guildOnly && !interaction.guild?.available) return interaction.reply({ 
            content: 'Для использования этой команды нужно [добавить бота](https://weikatc.me/sdc/) на сервер', 
            ephemeral: true 
        }) 

        if (command.execute.toString().includes('.guild.data')) await interaction.guild?.getData()
        return command.execute(interaction)
    }
}
