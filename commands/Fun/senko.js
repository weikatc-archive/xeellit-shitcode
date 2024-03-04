const keys = {}

module.exports = {
    command: {
        description: 'отправляет рандомные пикчи',
        aliases: ['taiga', 'meme', 'kaneki', 'megumin', 'kyaru', 'nana', 'mashiro', 'akame', 'kotori', 'kurome', 'mine', 'rin', 'tomori', 'gojou', 'isla', 'komari', 'renge'].sort(),
        permissions: { me: ['ATTACH_FILES'] },
        get usage() {
            return `<категория>`
        }
    },
    execute: async function (message, args, options) {
        if (this.aliases.includes(options.usage)) args.unshift(options.usage)

        const subcommand = args[0]?.toLowerCase()
        if (!subcommand) return message.channel.send(xee.commands.help('senko', options.prefix))
        if (!this.aliases.includes(subcommand)) return message.channel.send(`Подкоманды \`${subcommand}\` не существует`)

        const id = `${subcommand}:${message.author.id}`

        const image = await xee.rest.senko.api.images(subcommand).get({ query: { key: keys[id] || '' } }).catch(() => null)
        if (!image) return message.channel.send('Кажется, сайт умер... :(')

        if (image.key) keys[id] = image.key
        return message.channel.send({ files: [{ attachment: image.url }] })
    }
}
