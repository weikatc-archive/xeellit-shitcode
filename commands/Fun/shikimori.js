const { bbcodeMarkdown, chunk, formatDate, firstUpper } = require('../../client/util')
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js')

const Pagination = require('../../classes/Pagination')

module.exports = {
    command: {
        aliases: ['shiki'],
        usage: '<@имя пользователя | название аниме>',
        description: 'поиск аниме или профиля на shikimori.me',
        fullDescription: 'Чтобы найти профиль человека, напишите "@​" перед ник-неймом',
        permissions: { me: ['EMBED_LINKS'] },
        examples: {
            '{{prefix}}shikimori Toradora': 'найдет аниме по запросу Toradora',
            '{{prefix}}shikimori @FISPECKT': 'покажет профиль человека с именем FISPECKT'
        }
    },
    execute: async function (message, args, options) {
        if (!args.length) return message.channel.send(xee.commands.help(this, options.prefix))
        const isPing = args[0].startsWith('<@')

        if (args[0].startsWith('@') || isPing) {
            const username = args.join(' ').slice(isPing ? 0 : 1).replace(/<@!?(\d{17,19})>/g, (_, id) => xee.client.users.cache.get(id)?.username || _)
            if (!username) return message.channel.send('Нужно указать имя пользователя, который зарегистрирован на Shikimori')

            const data = await xee.rest.shikimori.api.users(username).get({ query: { is_nickname: 1 } }).catch(error => error.statusCode)
            if (data === 404) return message.channel.send('Пользователь не найден...')
            if (data === 502) return message.channel.send('Сервер временно недоступен, попробуйте позже.')
            if (typeof data === 'number') return message.channel.send('Пользователь не найден...')

            const [ bans, friends, anime, manga ] = await Promise.all([
                xee.rest.shikimori.api.users(data.id).bans.get(),
                xee.rest.shikimori.api.users(data.id).friends.get(),
                data.stats['has_anime?'] && xee.rest.shikimori.api.users(data.id).anime_rates.get({ query: { limit: 100000 } }).catch(() => []) || [],
                data.stats['has_manga?'] && xee.rest.shikimori.api.users(data.id).manga_rates.get({ query: { limit: 100000 } }).catch(() => []) || []
            ])

            const embed = new MessageEmbed()
                .setColor(xee.settings.color)
                .setDescription(`**${firstUpper(data.last_online)}**\n`)
                .setThumbnail(data.image.x160)

            embed.addField('Имя', data.name || '???', true)
            embed.addField('Пол', data.sex ? data.sex === 'male' ? '♂️' : '♀️' : '???' , true)
            embed.addField('Возраст', data.full_years ? xee.constructor.plural(['год', 'года', 'лет'], data.full_years, true) : '???', true)

            if (data.location) embed.addField('Локация', data.location)
            if (data.website) embed.addField('Веб-Сайт', (data.website.startsWith('http') ? '' : 'http://') + data.website)
            if (friends.length) embed.addField('Друзья', friends.slice(0, 9).map(x => `[${x.nickname}](${x.url})`).join(', '))

            const interface = new Pagination(message.author)
            interface.add({ 
                content: `Информация о пользователе **${data.nickname}**:`,
                embeds: [embed] 
            })

            if (bans.length) {
                interface.add({
                    content: `Блокировки пользователя **${data.nickname}**:`,
                    embeds: [
                        new MessageEmbed()
                            .setColor(xee.settings.color)
                            .addFields(
                                bans.slice(0, 7).map(ban => {
                                    return {
                                        name: formatDate(ban.created_at, 'F'),
                                        value: `Бан${ban.duration_minutes ? ` на **${ban.duration_minutes} мин**` : ''} за **${this.parseDescription(ban.reason).slice(0, 350)}**\n— [#${ban.id}](https://shikimori.me/moderations/bans/${ban.id})`
                                    }
                                })
                            )
                    ]
                })
            }

            if (anime.length || manga.length) {
                const frames = [ anime, manga ].sort((a, b) => b.length - a.length)
                const chunked = frames.map(frame => chunk(frame, 7))

                for (const index in chunked[0]) {
                    const frame = chunked[0][index]

                    const frameEmbed = new MessageEmbed()
                        .setColor(xee.settings.color)
                        .addField(frame[0].anime ? 'Аниме' : 'Манга', frame.map(this.formatName).join('\n'), true)

                    const _frame = chunked[1][index]
                    if (_frame?.length) frameEmbed.addField(_frame[0].anime ? 'Аниме' : 'Манга', _frame.map(this.formatName).join('\n'), true)

                    interface.add({
                        content: `Списки **${data.nickname}**:`,
                        embeds: [frameEmbed]
                    })
                }
            }

            return interface.send(message.channel)
        }

        const query = args.join(' ')
        const anime = await xee.rest.shikimori.api.animes.get({ query: { search: query, limit: 100 } }).catch(() => null)
        if (!anime) return message.channel.send('Возникла ошибочка, найти не получилось :\(')
        if (!anime.length) return message.channel.send('Не нашел такого аниме на shikimori.me, попробуй ещё раз')

        const selected = anime.length === 1 ? anime.shift() : anime.find(a => a.name.toLowerCase() === query) || await new Promise(async resolve => {
            const selectInterface = new Pagination(message.author.id, { reactions: { stop: '✅' } })
            anime.sort((a, b) => a.name.length - b.name.length).forEach((e, i, s) => selectInterface.add({
                    embeds: [
                        new MessageEmbed()
                            .setFooter('Выберите одно аниме из найденых' + `\nСтраница: ${i + 1} из ${s.length}`)
                            .setColor(xee.settings.color)
                            .setImage('https://shikimori.me' + e.image.original)
                            .setTitle(e.name)
                    ]
                })
            )

            await selectInterface.send(message.channel)
            selectInterface.collector.on('end', (_, reason) => ['paginationStop', 'messageDelete'].includes(reason) && resolve(anime[selectInterface.page - 1]))         
        })

        if (!selected) return

        const data = await xee.rest.shikimori.api.animes(selected.id).get()
        const otherNames = [].concat(data.english, data.japanese, data.synonyms).map(n => n?.trim()).filter(Boolean)

        return message.channel.send({
            embeds: [
                    new MessageEmbed()
                        .setColor(xee.settings.color)
                        .setTitle(`${data.russian} [${data.name}]`)
                        .setURL('https://shikimori.me' + data.url)
                        .setImage('https://shikimori.me' + data.image.original)
                        .setDescription(this.parseDescription(data.description))

                        .addField('Рейтинг', `${data.score} / 10`, true)
                        .addField('Длительность', `${xee.constructor.plural(['эпизод', 'эпизода', 'эпизодов'], data.episodes || data.episodes_aired, true)} ` + 
                                                      `(по ${xee.constructor.plural(['минут', 'минуты', 'минут'], data.duration, true)})`, true)
                        .addField('Другие имена', `\`\`\`\n${otherNames.length ? otherNames.join(' ') : 'ᅠ'}\n\`\`\``)
                        .addField('Теги', `\`\`\`${data.genres.map(x => x.russian).join(', ')}\`\`\``)
            ],
            components: data.franchise ? [
                new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setCustomId(`booru:${message.id}:${data.franchise}`)
                            .setLabel('Искать на Gelbooru')
                            .setStyle('SECONDARY')
                    )
            ] : []
        })
    },

    formatName: function (frame) {
        const info = frame.anime || frame.manga
        return `${frame.status ? `${
            ({
                completed: '✅',
                planned: '☑️',
                dropped: '❎',
                rewatching: '🔁',
                watching: '▶️',
                on_hold: '⏸️'
            })[frame.status]
        } ` : ''}[${info.name}](https://shikimori.me${info.url})`
    },

    parseDescription: function (str) {
        return bbcodeMarkdown(str)
            .replace(/\[anime=(.+?)\]((?:.|\n)+?)\[\/anime\]/gmi, '[$2](https://shikimori.me/animes/$1)')
            .replace(/\[character=(.+?)\]((?:.|\n)+?)\[\/character\]/gmi, '[$2](https://shikimori.me/characters/$1)')
            .replace(/\[manga=(.+?)\]((?:.|\n)+?)\[\/manga\]/gmi, '[$2](https://shikimori.me/mangas/$1)')
            .replace(/\[person=(.+?)\]((?:.|\n)+?)\[\/person\]/gmi, '[$2](https://shikimori.me/people/$1)')
            .slice(0, 1200)
    }
}
