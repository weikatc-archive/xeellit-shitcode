const { findMember } = require('../../client/util')

module.exports = {
    command: {
        description: 'добавляет фильтры к аватарке',
        aliases: ['gay', 'triggered', 'wasted', 'jpeg', 'magik'],// 'pet'],
        cooldown: 6,
        combine: true,
        examples: {
            '{{prefix}}filter gay': 'добавит радугу на аватарку или файл',
            '{{prefix}}magik': 'сделает кашу'
        },
        fullDescription: '**Доступные эффекты**: `gay`, `triggered`, `wasted`, `jpeg` и `magik`',
        usage: '[имя фильтра] <@user>',
        permissions: { me: ['ATTACH_FILES'] }
    },
    execute: async function (message, args, options) {
        if (!args.length || !this.aliases.includes(args[0].toLowerCase())) return message.channel.send(xee.commands.help('filter', options.prefix))

        let member

        if (args[1]) member = await findMember(message, args.slice(1).join(' ')) || message.member
        if (!member) member = message.member

        let image =
            message.attachments.filter(x => ['.png', '.jpg', '.gif', 'jpeg'].some(_x => x.name.endsWith(_x))).map(x => x.proxyURL)[0] ||
            member.user.displayAvatarURL({ format: 'png', size: 1024 })

        message.channel.sendTyping()

        try {
            switch (args[0].toLowerCase()) {
                case 'triggered':
                    message.channel.send({ files: [{ attachment: `https://some-random-api.ml/canvas/triggered?avatar=${image}`, name: `triggered.gif` }] })
                    break
                case 'gay':
                    message.channel.send({ files: [{ attachment: await xee.rest.kaneki.api.filter.gay.post({ json: { image }, encoding: null }), name: `gay.png` }] })
                    break
                case 'wasted':
                    message.channel.send({ files: [{ attachment: await xee.rest.kaneki.api.filter.wasted.post({ json: { image }, encoding: null }), name: `wasted.png` }] })
                    break
                case 'pet':
                    message.channel.send({ files: [{ attachment: `https://pet.moonlydays.com/pet.php?remote=${image}`, name: `pet.gif` }] })
                    break
                default:
                    let getImage = async (type, avatar) => {
                        let data = await xee.rest.nekobot.api.imagegen.get({ query: { type, intensity: 5, image: avatar, url: avatar } })
                        return data.message
                    }
                    message.channel.send({ files: [{ attachment: await getImage(args[0].toLowerCase(), image), name: `${args[0].toLowerCase()}.png` }] })
                    break
            }
        } catch {
            return message.channel.send('Что-то у меня нет настроения, попробуй позже...')
        }
    }
}
