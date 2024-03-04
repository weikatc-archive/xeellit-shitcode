const { MessageEmbed } = require('discord.js')
const fetch = require("../client/fetch")

module.exports = {
    config: {
        name: 'steam',
        description: 'Поиск игры в магазине Steam',
        options: [{
            type: 3,
            name: 'наименование',
            description: 'Название игры либо программы. Неважно',
            required: true
        }]
    },
    async execute(interaction) {
        const term = interaction.options.get('наименование').value

        const data = await fetch('https://store.steampowered.com/api/storesearch', { query: { term, l: 'ru', cc: 'ru' } }).then(games => games.items.shift())
        if (!data) return interaction.reply({ ephemeral: true, content: `Я ничего не нашел по запросу **${term.slice(0, 100)}**.` })

        const gameData = await fetch(`https://store.steampowered.com/api/appdetails?appids=${data.id}`, {
            headers: {
                'Accept-Language': 'ru-RU,ruq=0.8,en-USq=0.5,enq=0.3'
            }
        }).then(result => result[data.id])

        if (!gameData.success) return interaction.reply({ ephemeral: true, content: `Не удалось удачно получить информацию о приложении **${data.name}**.` })
        const { data: fullData } = gameData


        const platforms = []
        for (const platform in data.platforms) {
            if (data.platforms[platform]) platforms.push({
                windows: '<:windows:987356520784207872>',
                linux: '<:steamos:987356521467891742>',
                mac: '<:mac:987356520184430662>'
            }[platform])
        }

        const embed = new MessageEmbed()
            .setURL(`https://store.steampowered.com/app/${data.id}/`)
            .setDescription(gameData.short_description?.replace(/&quot/g, '"') || '')
            .setTitle(fullData.name)
            .setColor(xee.settings.color)
            .setImage(data.tiny_image) 
            .addField('Дата выхода', fullData.release_date.date ?? '???', true)
            .addField('Платформы', platforms.join(' ') || '???', true)
            .addField('Цена', !fullData.is_free ? fullData?.price_overview?.final_formatted ?? '???' : 'Бесплатно', true)
            .addField('Разработчик', fullData.developers?.[0] || 'нет', true)
            .addField('Издатель', fullData.publishers[0]?.trim() || 'нет', true)

        if (fullData.website) embed.addField('Вебсайт', fullData.website, true)
        return interaction.reply({ embeds: [embed] })
    }
}
