const { findByName } = require('../../client/finder')

module.exports = {
    command: {
        description: 'установка автоматической роли',
        fullDescription: `Авто-роль — это роль, которая будет даваться всем новым участникам сервера`,
        usage: '[@роль]',
        examples: {
            '{{prefix}}autorole': 'покажет текущую авто-роль',
            '{{prefix}}autorole @Смерть': 'назначит роль @Смерть, как авто-роль'
        },
        permissions: {
            user: ['MANAGE_ROLES'],
            me: ['MANAGE_ROLES']
        }
    },
    execute: async function (message, args, options) {
        const isRole = !!message.guild.roles.cache.get(message.guild.data.autoRole)?.editable

        switch(args[0]?.toLowerCase()) {
            case undefined:
                return message.channel.send(isRole ? `Авто-роль сервера: **${message.guild.roles.cache.get(message.guild.data.autoRole).name}** (${message.guild.data.autoRole})` : `Авто-роль на сервере не установлена. Чтобы установить авто-роль на сервере, используй \`${options.prefix}autorole <@роль>\``)

            case 'remove':
            case 'delete':
            case 'reset':
                if (!isRole) return message.channel.send('По моему, роли нет, а ты её удалить хочешь...')  
                await message.guild.data.update({ $set: { autoRole: null } })
                return message.channel.send('Авто-роль сервера была сброшена')

            default: 
                const role = findByName(message.guild.roles.cache, args.join(' '))
                if (!role) return message.channel.send(`Хочешь открою Америку? Роли **${args.join(' ').slice(0, 100)}** на сервере нет`)

                const tags = role.tags
                if (tags) {
                    if (tags.botId) return message.channel.send(`Роль **${role.name}** принадлежит боту **<@!${tags.botId}>**.`)
                    if (tags.premiumSubscriberRole) return message.channel.send(`Роль **${role.name}** выдается только бустерам сервера...`)
                }

                if (role.managed) return message.channel.send(`Прости, но управление ролью **${role.name}** осуществляет интеграция`)
                if (role.id === message.guild.roles.everyone.id) return message.channel.send('Зачем? Эта роль выдается дискордом...')
                if (!role.editable) return message.channel.send('Да, роль должна быть не выше меня и не на моем уровне, а ниже меня...')
                if (message.member.roles.cache.size !== 1 && role.position >= message.member.roles.highest.position) return message.channel.send('Нужна роль ниже твоей наивысшей...')

                await message.guild.data.update({ $set: { autoRole: role.id } })
                return message.channel.send(`${role} назначена как авто-роль этого сервера`)
        }
    }
}
