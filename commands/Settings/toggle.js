const { MessageEmbed } = require('discord.js')

module.exports = {
    command: {
        description: 'отключение или включение команд',
        usage: '<имя команды>',
        examples: {
            '{{prefix}}toggle': 'покажет отключенные команды',
            '{{prefix}}toggle rooms': 'отключит команду rooms на сервере'
        },
        permissions: {
            user: ['MANAGE_GUILD'],
            me: ['EMBED_LINKS']
        }
    },
    execute: async function (message, args, options) {
        const toggled = message.guild.data.toggle?.filter(c => xee.commands.has(c)) || null

        if (args.length) {
            const commandName = args[0].toLowerCase().slice(0, 40)
            const command = xee.commands.resolve(commandName)
            if (!command || !xee.settings.owners.includes(message.author.id) && command.ownerOnly) return message.channel.send(`Команды с именем \`${commandName}\` не существует`)
            if (['_help', 'help', 'toggle', 'prefix', 'evaluate'].includes(command.name) && !xee.settings.owners.includes(message.author.id)) return message.channel.send(`Команду \`${commandName}\` отключить нельзя, к сожалению`)

            if (toggled?.includes(command.name)) {
                await message.guild.data.update({ $pull: { toggle: command.name } })
                return message.channel.send(`Команда \`${command.name}\` была вновь включена для всех`)
            }

            if (!toggled) await message.guild.data.update({ $set: { toggle: [command.name] } })
            else await message.guild.data.update({ $push: { toggle: command.name } })
            
            return message.channel.send(`Команда \`${command.name}\` была отключена на этом сервере. Кстати, на тех, у кого есть право на Управление сообщениями, отключения игнорируются...`)
        }

        if (!toggled?.length) return message.channel.send(`Ты должен указать имя команды, которую ты хочешь отключить`)
        return message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setColor(xee.settings.color)
                    .setAuthor({ name: 'Отключенные команды', iconURL: message.guild.iconURL({ size: 2048, dynamic: true }) })
                    .setDescription(toggled.map(c => `\`${c}\``).join(', ').slice(0, 2040))
            ]
        })
    }
}
