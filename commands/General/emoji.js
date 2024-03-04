const { Util } = require('discord.js')
const { findByName } = require('../../client/finder')

const fetch = require('../../client/fetch')

module.exports = {
    command: {
        description: 'показывает эмодзи',
        usage: '[add] <эмодзи> [роль]',
        fullDescription: 'Если вы хотите добавить эмодзи на сервер, добавьте `add` перед указанием эмодзи. Чтобы назначить роль, с которой можно будет использовать эмодзи на сервере — добавьте укажите роль после эмодзи. Также смотрите на 3-ий пример.\n',
        examples: {
            '{{prefix}}emoji <:plak:786489466268549140>': 'отправит эмодзи plak как изображение',
            '{{prefix}}emoji add a:loli:429888284307619850': 'добавит анимированное эмодзи на сервер',
            '{{prefix}}emoji add <a:flycat:563703680960954397> Колдун': 'добавит эмодзи <a:flycat:563703680960954397> на сервер и разрешит его использовать только участникам с ролью Колдун',
        },
        permissions: { me: ['ATTACH_FILES'] }
    },
    execute: async function (message, args, options) {
        let add = false
        let emoji = null

        if (args[0]?.toLowerCase() === 'add') add = args.shift()
        if (!args.length) return message.channel.send(xee.commands.help(this, options.prefix))

        try {
            emoji = Util.parseEmoji(args.join(' '))
        } catch { emoji = null }

        if (!emoji || !emoji.id) return message.channel.send('Эмодзи указано неверно. Просто напиши эмодзи или укажи его в этом формате если то не анимированное: `name:id`. Если случай другой, добавь приставку `a:` к выбранному эмодзи: `a:name:id`')

        let emojiCache = await fetch(`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`, { stream: true })
        if (emojiCache.statusCode !== 200) return message.channel.send('Чем ты думаешь, когда пишешь это?')

        if (add) {
            if (!message.member.permissions.has('MANAGE_EMOJIS_AND_STICKERS')) return message.channel.send('У тебя нету права на управление эмодзи, плак')
            if (!message.guild.members.me.permissions.has('MANAGE_EMOJIS_AND_STICKERS')) return message.channel.send('Право на создание эмодзи на сервере мне не выдали, ухожу в запой')

            let role

            if (args[1]) {
                role = findByName(message.guild.roles.cache, args.slice(1).join(' '))
                if (!role) return message.channel.send('Я не орел и не вижу роль, которую ты написал')
                if (role.id === message.guild.roles.everyone.id) role = null
            }

            return message.guild.emojis.create(emojiCache, emoji.name, role ? { roles: [role] } : {})
                .then(emoji => message.channel.send(`Эмодзи ${emoji} создано на этом сервере. ${role ? `Да, это эмодзи могут использовать только те, у кого есть роль **${role.name}**.` : ''}`))
                .catch(error => error.message.includes('Maximum number') ? message.channel.send('На сервере лимит эмодзи этого типа') : message.channel.send('Что-то пошло не так при добавлении эмодзи...'))
        } else return message.channel.send({ files: [{ attachment: emojiCache, name: `${emoji.name}.${emoji.animated ? 'gif' : 'png'}` }] })
    }
}