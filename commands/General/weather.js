const { MessageEmbed } = require('discord.js')
const { firstUpper } = require('../../client/util')

const Pagination = require('../../classes/Pagination')
const formatDate = date => new Date(date).toLocaleString('ru', { timeZone: 'Europe/Moscow', month: 'short', ...Object.fromEntries(['day', 'hour', 'minute', 'year'].map(r => [r, 'numeric'])) })

module.exports = {
    command: {
        description: 'показывает погоду',
        usage: '<город>',
        examples: {
            '{{prefix}}weather Псков': 'покажет погоду во Пскове',
            '{{prefix}}weather 660000': 'покажет погоду по индексу 660000'
        },
        permissions: {
            me: ['EMBED_LINKS']
        }
    },
    execute: async function (message, args, options) {
        if (!args.length) return message.channel.send('Тебе нужно было написать название города')
        const data = await xee.rest.openweathermap.api.weather.get({
            query: { q: args.join(' '), lang: 'ru', units: 'metric' }
        }).catch(e => e.message)
        if (typeof data === 'string') return message.channel.send(`Населенный пункт **${args.join(' ').slice(0, 20)}** не найден`)
        const detailed = await xee.rest.openweathermap.api.onecall.get({
            query: { lang: 'ru', lat: data.coord.lat , lon: data.coord.lon, units: 'metric' }
        })

        let interface = new Pagination(message.author.id)
        
        const embed = new MessageEmbed()
            .setTitle(data.name)
            .setURL(`https://openweathermap.org/city/${data.id}`)
            .setColor(xee.settings.color)
            .addField('Температура', `Сейчас: **${data.main.temp}°C**\nОщущается: **${data.main.feels_like}°C**`, true)
            .addField('Ветер', `Скорость: **${data.wind.speed} м/с**\nНаправление: **${data.wind.deg}°**`, true)
            .addField('Другое', `Влажность: **${data.main.humidity}%**\nДавление: **${data.main.pressure}мм рс**`)

        if (data.weather?.length) embed
            .setDescription(firstUpper(data.weather[0].description))
            .setThumbnail(`https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`)

        interface.add({ embeds: [embed] })

        if (detailed.alerts?.length) interface.add({
            embeds: [
                new MessageEmbed()
                .setColor(xee.settings.color)
                .setTitle(data.name)
                .setURL(`https://openweathermap.org/city/${data.id}`)
                .setThumbnail(`https://openweathermap.org/img/wn/${data.weather[0]?.icon}@2x.png` || null)
                .addFields(detailed.alerts.map(alert => ({
                    name: alert.event,
                    value: `${formatDate(alert.start * 1000)} - ${formatDate(alert.end * 1000)}\n${alert.description ? `\`\`\`${alert.description}\`\`\`` : ''}\n`
                })))
            ]
        })

        return interface.send(message.channel)
    }
}
