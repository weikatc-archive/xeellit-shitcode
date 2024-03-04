const basename = require('discord.js').Util.basename
const fetch = require('../client/fetch')
const parse = data => typeof data === 'string' ? JSON.parse(data) : data

const parents = {
    hentai: [
        () => xee.rest.hmtai.api.ass.get().then(parse)
    ],
    anal: [
        () => xee.rest.hmtai.api.anal.get().then(parse),
        () => xee.rest.nekobot.api.image.get({ query: { type: 'hanal' } })
    ],
    neko: [
        () => xee.rest.nekos.api.img.neko.get(),
        () => xee.rest.hmtai.api.nsfwNeko.get().then(parse),
        () => xee.rest.nekobot.api.image.get({ query: { type: 'neko' } })
    ],
    classic: [ () => xee.rest.hmtai.api.classic.get().then(parse) ],
    ero: [ () => xee.rest.hmtai.api.ero.get().then(parse) ],
    cum: [ () => xee.rest.hmtai.api.cum.get().then(parse) ],
    yuri: [ () => xee.rest.hmtai.api.yuri.get().then(parse) ],
    boobs: [ () => xee.rest.hmtai.api.boobs.get().then(parse) ],
    boobjob: [ () => xee.rest.hmtai.api.boobjob.get().then(parse) ],
    handjob: [ () => xee.rest.hmtai.api.handjob.get().then(parse) ],
    footjob: [ () => xee.rest.hmtai.api.footjob.get().then(parse) ],
    blowjob: [ () => xee.rest.hmtai.api.blowjob.get().then(parse) ],
    femdom: [ () => xee.rest.hmtai.api.femdom.get().then(parse) ]
}

const getImageURL = r => r?.url || r?.message || r?.image || r?.link || null
const sleep = t => new Promise(resolve => setTimeout(resolve, t))

module.exports = {
    command: {
        aliases: Object.keys(parents).sort(),
        usage: '<категория>',
        cooldown: 3,
        combine: true,
        description: 'NSFW команды',
        examples: {
            '{{prefix}}nsfw hentai': 'отправит пикчу с хентаем',
            '{{prefix}}hentai': 'то же самое, что и первый пример'
        }
    },
    execute: async function (message, args, options) {
        const removeCooldown = () => this.cooldowns ? this.cooldowns.delete(message.author.id) : null

        if (!message.channel.nsfw) return message.channel.send('Это NSFW канал...? Не...').then(removeCooldown)
        if (!args.length) return message.channel.send(xee.commands.help('nsfw', options.prefix)).then(removeCooldown)
        const parent = parents[args[0].toLowerCase()]
        if (!parent) return message.channel.send(`Категории \`${args[0].slice(0, 100)}\` не существует`).then(removeCooldown)

        const image = await (xee.random(parent))().catch(() => null).then(r => getImageURL(r))
        if (!image) return this.execute(message, args, options)

        const stream = await fetch(image, { stream: true })
        if (+stream.headers['content-length'] > 8 * 1024 * 1024) return stream.destroy() && this.execute(message, args, options)

        const isReact = message.channel.permissionsFor(message.guild.me).has(['ADD_REACTIONS', 'READ_MESSAGE_HISTORY'])
        const isAttachment = message.channel.permissionsFor(message.guild.me).has('ATTACH_FILES')

        const _message = await message.channel.send({ 
            content: `${isReact ? `Используй \`🔁\`, чтобы обновить изображение` : ''}\n${isAttachment ? '' : image}`, 
            files: isAttachment && [{ attachment: stream, name: basename(image) }] || [] 
        }).catch(() => this.execute(message, args, options))


        if (!isReact) return
        await sleep(this.cooldown)

        if (!_message?.id || _message.deleted) return
        else xee.react(_message, '🔁')

        const collected = await _message.awaitReactions({ 
            max: 1, 
            user: message.author, 
            filter: (reaction, user) => reaction.emoji.name === '🔁' && user.id === message.author.id
        })

        if (!collected?.size) return
        if (_message?.deletable && !_message.deleted) _message.delete().catch(() => null)

        this.uses++
        return this.execute(message, args, options)
    }
}
