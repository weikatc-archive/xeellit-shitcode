const { findByName } = require('../../client/finder')

module.exports = {
    command: {
        description: 'установка роли модераторов',
        fullDescription: `С помощью роли модераторов, участники смогут использовать все команды категории "Moderation" не имея прав.`,
        usage: '[@роль | remove]',
        examples: {
            '{{prefix}}modrole': 'покажет текущую роль модераторов',
            '{{prefix}}modrole @Пуськи': 'установит роль модераторов, как роль @Пуськи'
        },
        permissions: {
            user: ['MANAGE_ROLES']
        }
    },
    execute: async function (message, args, options) {
        const isRole = message.guild.roles.cache.get(message.guild.data.modRole)

        if (!args.length) return message.channel.send(isRole ? `Роль модераторов сервера: ${isRole.name}.` : `Роль модераторов не установлена. Чтобы установить, используйте \`${options.prefix}modrole [@роль]\``)

        if (isRole && ['remove', 'delete', 'reset'].includes(args[0].toLowerCase())) {
            await message.guild.data.update({ $set: { modRole: null } })
            return message.channel.send('Роль модераторов была сброшена')
        }

        const role = findByName(message.guild.roles.cache, args.join(' '))
        if (!role) return message.channel.send(`Роли **${args.join(' ').slice(0, 100)}** на сервере не нашел`)
        if (role.tags?.botId) return message.channel.send(`Роль **${role.name}** принадлежит боту. Боты не могут использовать команды.`)
        if (role.id === message.guild.roles.everyone.id) return message.channel.send(role.permissions.has('ADMINISTRATOR') ? 'Зачем, если здесь все Боги?' : 'А в чем тогда проблема дать право администратора роли everyone? Гулять так гулять')

        await message.guild.data.update({ $set: { modRole: role.id } })
        return message.channel.send(`Роль модераторов ${isRole ? 'обновлена' : 'установлена'}: ${role}. Теперь все, кто будут иметь эту роль могут использовать команды из категории "Moderation" не имея нужных прав`)
    }
}
