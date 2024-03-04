const fetch = require('../../client/fetch')
module.exports = {
    command: {
        description: 'покажет цвет',
        usage: '<цвет | random>',
        aliases: ['colour'],
        examples: {
            '{{prefix}}color random': 'сгенерирует рандомный цвет и покажет его',
            '{{prefix}}color #020202': 'покажет информацию о цвете #020202'
        },
        permissions: {
            me: ['ATTACH_FILES']
        }
    },
    execute: async function (message, args, options) {
        if (!args.length) return message.channel.send(xee.commands.help('color', options.prefix))
        let color = args[0].toLowerCase()
        let type = 'hex'

        if (color === 'random') color = Math.floor(Math.random() * 16777215).toString(16).padEnd(6, '0')
        if (color.startsWith('rgb')) type = 'rgb'
        if (color.startsWith('hsl')) type = 'hsl'
        if (type === 'hex' && !color.startsWith('#')) color = '#' + color

        const fetched = await fetch(`http://www.thecolorapi.com/id?${type}=${encodeURIComponent(color)}`).catch(() => null)
        if (!fetched || fetched.cmyk.value.includes('NaN')) return message.channel.send(`Что-то я не знал, что цвет ${color} cуществует. Ну и ладно, не буду знать дальше`)

        const image = await fetch(`https://singlecolorimage.com/get/${fetched.hex.clean}/100x100`, { stream: true }).catch(() => null)

        return message.channel.send({ 
            content: `:paintbrush: **${fetched.name.value}**:\nHex: **${fetched.hex.value}**,\nRGB: **${fetched.rgb.value}**,\nHSV: **${fetched.hsv.value}**,\nCMYK: **${fetched.cmyk.value}**.`, 
            files: [ image ? { attachment: image, name: 'color.png' } : {} ]  })
    }
}
