const Pagination = require('../../classes/Pagination')

module.exports = {
    command: {
        aliases: ['b64'],
        description: 'кодирует текст в кодировку base64',
        usage: '<encode | decode> [text]',
        examples: {
            '{{prefix}}base64 Hello World': 'закодирует Hello World',
            '{{prefix}}base64 decode cGVhY2U=': 'наоборот, раскодирует cGVhY2U='
        }
    },
    execute: async function (message, args, options) {
        let mode = 'encode'
        let str = args.join(' ')
        if (['encode', 'decode'].includes(args[0]?.toLowerCase())) {
            mode = args[0]
            str = args.slice(1).join(' ')
        }
        if (!args.length) return message.channel.send(xee.commands.help('base64', options.prefix))

        let output = this.base64(str, mode)
        if (!output.trim().length) return message.channel.send('Мои сили не выдержали твой запрос')
        if (output.length < 2000) return message.channel.send(output)
        return message.channel.send('Результат по моему не влезет... =\(')

    },
    base64(text, action = 'encode') {
        if (action === 'encode') return Buffer.from(text).toString('base64')
        if (action === 'decode') return Buffer.from(text, 'base64').toString('utf8')
        throw new SyntaxError('Invalid base64 mode')
    }
}