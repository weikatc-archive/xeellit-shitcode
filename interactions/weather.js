const { MessageEmbed } = require('discord.js')
const { firstUpper } = require('../client/util')

module.exports = {
    config: {
        name: 'weather',
        description: 'Покажет текущую погоду',
        options: [{
            name: 'местоположение',
            description: 'Может быть названием населенного пункта или индексом',
            type: 3,
            required: true
        }]
    },
    execute: async function(interaction) {
        const args = interaction.options.get('местоположение')?.value

        const data = await xee.rest.openweathermap.api.weather.get({
            query: { q: args, lang: 'ru', units: 'metric' }
        }).catch(e => e.message)
        if (typeof data === 'string') return interaction.reply({ content: `Населенный пункт **${args.
            slice(0, 100)}** не найден`, ephemeral: true})
        
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

        return interaction.reply({ embeds: [embed] })
    }
}
