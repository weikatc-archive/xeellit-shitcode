const { MessageEmbed, MessageActionRow, MessageButton, SnowflakeUtil } = require('discord.js')
const { setTimeout } = require('timers/promises') 
const fetch = require('../client/fetch')

async function fetchComplete(text, length = 30, attempt = 0) {
    let data
    
    while (attempt < 5) {
        data = await fetch('https://pelevin.gpt.dobro.ai/generate/', {
            json: { prompt: text, length }, method: 'POST',
        }).catch(() => {})
        
        if (data) break
        
        attempt++
        await setTimeout(1000)
    }
    
    return data
}

function fetchLink(text, complete) {
    return fetch('https://porfirevich.ru/api/story', {
        json: { content: `[[\"${text}\",0],[\"${complete}\",1],[\"\\n\",0]]` }, method: 'POST'
    }).then(r => 'https://porfirevich.ru/' + r.id).catch(() => {})
}

async function getComplete(entries, text, callback) {
    const complete = entries.shift()
    if (complete) return { entries, complete }

    await callback?.()
    const data = await fetchComplete(text)
    return data ? await getComplete(data.replies, text) : null
}

function getMessage(text, { complete }) {
    return { embeds: [
        new MessageEmbed()
            .setColor(0x5371ff)
            .setTitle('Порфирьевич')
            .setURL('https://porfirevich.ru/')
            .setDescription(`${text}**${complete}**`.slice(0, 4096))
    ] }
}

function getComponents(id, disabled = false) {
    return new MessageActionRow()
        .addComponents(
            ...[
                ['generate', 'Дополнить', '🗨️', 'PRIMARY'],
                ['regenerate', 'Перегенерировать', '🔄', 'PRIMARY'],
                ['end', 'Завершить генерацию', '⏹️', 'SECONDARY']
            ].map(c => new MessageButton().setDisabled(disabled).setCustomId(id + '-' + c.at(0)).setLabel(c.at(1)).setEmoji(c.at(2)).setStyle(c.at(3)))
        )
}

module.exports = {
    config: {
        name: 'skynet',
        description: 'Продолжает введенный текст, используя Skynet',
        options: [{
            type: 3,
            name: 'текст',
            description: 'Текст для продолжения',
            required: true
        }]
    },
    cooldown: 30,
    aliases: ['Продолжить текст'],
    async execute(interaction) {
        const id = SnowflakeUtil.generate()
        const text = interaction.options.get('текст')?.value ?? interaction.options.get('message')?.message.content
        if (!text) return interaction.reply({ ephemeral: true, content: 'Сообщение должно что-то содержать.' })

        if (!interaction.deferred || !interaction.replied) {
            await interaction.deferReply()
        }

        let complete = await getComplete([], text).catch(console.log)
        if (!complete?.complete) return interaction.editReply({
            content: 'При получении продолжения возникла ошибка. Что-то пошло не так.',
            components: [],
        })

        await interaction.editReply({
            ...getMessage(interaction.fullInput || text, complete),
            components: [getComponents(id)]
        })

        const collector = interaction.channel.createMessageComponentCollector({
            filter: c => c.message.interaction.id === interaction.id,
            idle: 120000
        })

        collector.on('collect', async click => {
            if (click.user.id !== interaction.user.id) return click.deferUpdate()

            switch(click.customId.split('-').pop()) {
                case 'end':
                    collector.stop()
                    await click.update({
                        components: [getComponents(id, true)],
                        content: null,
                    })

                    const link = await fetchLink(interaction.fullInput || text, complete.complete)
                    await interaction.editReply({
                        components: [link && 
                            new MessageActionRow()
                                .addComponents(
                                    new MessageButton()
                                        .setLabel('Ссылка')
                                        .setEmoji('🔗')
                                        .setStyle('LINK')
                                        .setURL(link)
                                )   
                        ].filter(Boolean)
                    })
                    
                    xee.interactions.get('skynet').cooldowns.delete(interaction.user.id)
                    break

                case 'generate':
                    if (interaction.fullInput) interaction.fullInput += complete.complete
                    else interaction.fullInput = `${text}${complete.complete}`

                    if (interaction.options.get('текст')) interaction.options.get('текст').value = complete.complete
                    else interaction.options.get('message').message.content = complete.complete
                    await click.update({ components: [ getComponents(id, true) ] })

                    collector.stop()
                    await this.execute(interaction)
                    break

                case 'regenerate':
                    complete = await getComplete(complete.entries, text, () => click.update({ components: [ getComponents(id, true) ] })).catch(console.log)
                    if (!complete) return click.editReply({ content: 'Произошла ошибка...', components: [] })

                    await (click.replied ? click.editReply : click.update).bind(click)({
                        ...getMessage(interaction.fullInput || text, complete),
                        components: [getComponents(id)]
                    })

                    break
            }
        })

    }
}
