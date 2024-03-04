const fetch = require('../../client/fetch')

module.exports = {
    command: {
        description: 'конвертер валют',
        usage: '<с> <на> <сумма>',
        examples: {
            '{{prefix}}convert RUB USD 1': 'переведет 1 рубль в доллар США',
        }
    },
    execute: async function (message, args, options) {
        const from = args[0]?.toUpperCase()
        const to = args[1]?.toUpperCase()
        const sum = +args[2]

        if (!from || !to || isNaN(sum) || !isFinite(sum)) return message.channel.send(xee.commands.help('convert', options.prefix))
        if (from === to) return message.channel.send('???')

        const data = await fetch('https://www.cbr-xml-daily.ru/daily_json.js').then(JSON.parse).then(x => x.Valute).catch(() => null)
        if (!data) return message.channel.send('Что-то не так...')

        data['RUB'] = { CharCode: 'RUB', Nominal: 1, Name: 'Российский рубль', Value: 1 } // ахахах умный да

        const formattedValute = Object.keys(data).map(c => `\`${c}\``).join(', ')
        if (!this.fullDescription) this.fullDescription = `**Доступные валюты**: ${formattedValute}`


        if (!(from in data) || !(to in data)) return message.channel.send(`Неверно указана валюта. Перед повторным выполнением команды убедитесь, что она есть в следующем списке: ${formattedValute}.`)

        const dataFrom = data[from]
        const dataTo = data[to]

        message.channel.send(`${sum} ${dataFrom.Name} = ${(sum * (dataFrom.Value / dataFrom.Nominal) / (dataTo.Value / dataTo.Nominal)).toFixed(2)} ${dataTo.Name}`)
    }
}