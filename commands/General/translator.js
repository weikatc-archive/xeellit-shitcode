const languages = {
    af: 'Африкаанс',
    am: 'Амхарский',
    ar: 'Арабский',
    az: 'Азербайджанский',
    be: 'Белорусский',
    bg: 'Болгарский',
    bn: 'Бенгальский',
    bs: 'Боснийский',
    ca: 'Каталанский',
    cy: 'Валлийский',
    da: 'Датский',
    de: 'Немецкий',
    el: 'Греческий',
    en: 'Английский',
    eo: 'Эсперанто',
    es: 'Испанский',
    et: 'Эстонский',
    eu: 'Баскский',
    fa: 'Персидский',
    fi: 'Финский',
    fr: 'Французский',
    ga: 'Ирландский',
    gd: 'Шотландский',
    gl: 'Галисийский',
    gu: 'Гуджарати',
    he: 'Иврит',
    hi: 'Хинди',
    hr: 'Хорватский',
    ht: 'Гаитянский',
    hu: 'Венгерский',
    hy: 'Армянский',
    id: 'Индонезийский',
    is: 'Исландский',
    it: 'Итальянский',
    ja: 'Японский',
    jv: 'Яванский',
    ka: 'Грузинский',
    kk: 'Казахский',
    km: 'Кхмерский',
    kn: 'Каннада',
    ko: 'Корейский',
    ky: 'Киргизский',
    la: 'Латынь',
    lb: 'Люксембургский',
    lo: 'Лаосский',
    lt: 'Литовский',
    lv: 'Латышский',
    mg: 'Малагасийский',
    mi: 'Маори',
    mk: 'Македонский',
    ml: 'Малаялам',
    mn: 'Монгольский',
    mr: 'Маратхи',
    ms: 'Малайский',
    mt: 'Мальтийский',
    my: 'Бирманский',
    ne: 'Непальский',
    nl: 'Нидерландский',
    no: 'Норвежский',
    pa: 'Панджаби',
    pl: 'Польский',
    pt: 'Португальский',
    ro: 'Румынский',
    ru: 'Русский',
    si: 'Сингальский',
    sk: 'Словацкий',
    sl: 'Словенский',
    sq: 'Албанский',
    sr: 'Сербский',
    su: 'Сунданский',
    sv: 'Шведский',
    sw: 'Суахили',
    ta: 'Тамильский',
    te: 'Телугу',
    tg: 'Таджикский',
    th: 'Тайский',
    tl: 'Тагальский',
    tr: 'Турецкий',
    tt: 'Татарский',
    uk: 'Украинский',
    ur: 'Урду',
    uz: 'Узбекский',
    vi: 'Вьетнамский',
    xh: 'Коса',
    yi: 'Идиш',
    zh: 'Китайский'
}

const { MessageEmbed } = require('discord.js')
const fetch = require('../../client/fetch')

module.exports = {
    command: {
        usage: '<язык, с которого переводить | auto> <язык, на который перевести> <текст>',
        description: 'перевод текста', fullDesctiption: 'Языки должны быть указаны в формате ISO-639-1.',
        aliases: ['tr'],
        examples: { '{{prefix}}translate auto ru Bonjour': 'переведет Bonjour на русский язык' },
        permissions: { me: ['EMBED_LINKS'] }
    },
    execute: async function(message, args) {
        if (args.length < 2) return message.channel.send(`Должно быть два языка: с какого переводить и на какой переводить указанный текст`)

        const sl = args.shift().toLowerCase()
        const tl = args.shift().toLowerCase()

        if (sl !== 'auto' && !(sl in languages)) return message.channel.send('Указан не верный язык текста. Напоминаю формат: ISO-639-1')
        if (!(tl in languages)) return message.channel.send('Укажи верный язык для перевода, пожалуйста') 
        if (!args.length) return message.channel.send('Текст для перевода не указан')

        const q = args.join(' ')
        const res = await fetch('https://translate.googleapis.com/translate_a/single?', { query: { client: 'gtx', sl, tl, hl: 'ru', dt: 't', dj: 1, q } }).catch(e => e.body)
        if (!res) return message.channel.send('При переводе текста произошла ошибка')
        if (res.src === tl) return message.channel.send(`${languages[res.src]} на ${languages[res.src]} -_\_\_\_-`)

        message.channel.send({
            embeds: [
                new MessageEmbed()
                    .setDescription((res.sentences?.length ? res.sentences.map(c => c.trans).filter(c => c !== undefined && c !== null).join('') : q).slice(0, 4096))
                    .setColor(0x4285F4)
                    .setURL(`https://translate.google.com/`)
                    .setTitle(`${languages[res.src || sl] ?? 'Выдуманный'} на ${languages[tl]}`)
            ]
        })
    }
}
