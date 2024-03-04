const fetch = require('../../client/fetch')

module.exports = {
    command: {
        aliases: ['calc'],
        description: 'обычный калькулятор с классными функциями',
        usage: '<выражение>',
        examples: {
            '{{prefix}}math 1 + 1': 'решит "сложный пример" и выведет **2**',
            '{{prefix}}math 6 * 34 / 2': 'посчитает на калькуляторе **6 * 34 / 2**'
        }
    },
    execute: async function (message, args, options) {
        if (!args.length) return message.channel.send('Мне интересно, сколько будет **1000-7**?')
        let expr = args.join(' ')
            .replace(/'|"|`/g, '')
            .replace(/:/g, '/')

        message.channel.sendTyping()

        let evaled = await fetch('https://api.mathjs.org/v4/', { query: { expr } }).catch(e => e.body)
        if (!evaled) return this.execute(message, args)

        if (!evaled.length) return message.channel.send('Не знаю как так получилось, но получилась пустота')

        if (evaled.toLowerCase().startsWith('error')) {
            if (evaled.includes('ERR_WORKER_OUT_OF_MEMORY')) return message.channel.send('Калькулятор начал считать, и сразу же издох')
            if (evaled.includes('Undefined symbol')) return message.channel.send(`Странный вопрос, но что такое \`${evaled.match(/Undefined symbol (.+)/)[1]?.slice(0, 30) ?? 'тут пусто да'}\`?`)
            return message.channel.send('Выражение написано не правильно, или у меня беды...')
        } else if (evaled.startsWith('TimeoutError:')) return message.channel.send('Калькулятор слишком долго считал, и в итоге не досчитал...')

        if (evaled.includes('function') || evaled.startsWith('[function')) return message.channel.send('Что мне теперь делать с этой функцией?')
        if (evaled === '[]') return message.channel.send('Калькулятор выдал пустоту. Почему? Я не знаю')

        if (/\[\d+\]/.test(evaled)) evaled = evaled.match(/\[(\d+)\]/)[1]
        evaled = evaled.replace(/true|false/, m => (m === 'false' ? 'не ' : '') + 'верно')

        if (evaled.length > 1900) return message.channel.send('Получилось слишком много символов, отправить не смогу =\(')
        else return message.channel.send(`Результат вычисления: **${evaled}**`.slice(0, 1990))
    }
}
