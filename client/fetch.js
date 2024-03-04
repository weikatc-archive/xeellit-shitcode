const { Stream, Readable } = require('stream')
const { stringify, parse } = require('querystring')

module.exports = function fetch(url, options = {}) {
    if (!(url instanceof URL)) url = new URL(url)
    if (!('encoding' in options)) options.encoding = 'utf-8'
    if (options.query) Object.entries(options.query).forEach(e => url.searchParams.append(...e))
    if (typeof options.headers !== 'object') options.headers = {}

    if (['json', 'form', 'multipart'].some(o => o in options)) {
        if ('json' in options) {
            options.body = JSON.stringify(options.json)
            options.headers['content-type'] = 'application/json'
        } else if ('form' in options) {
            options.body = stringify(options.form)
            options.headers['content-type'] = 'application/x-www-form-urlencoded'
        } else {
            const boundary = String(Math.random()).slice(2)
            options.body = new Multipart(boundary).add(Object.entries(options.multipart))
            options.headers['content-type'] = `multipart/form-data boundary=${boundary}`        
        }
        if (typeof options.body === 'string' || Buffer.isBuffer(options.body)) options.headers['content-length'] = Buffer.byteLength(options.body)
    }

    return new Promise((resolve, reject) => {
        const req = require(url.protocol.slice(0, -1)).request(url, options, res => {
            if (options.stream) return resolve(res)
            if (options.req) return resolve(req)

            const chunks = []
            let stream = res

            if (['gzip', 'compress', 'deflate', 'x-gzip'].includes(res.headers['content-encoding']?.toLowerCase()))
                stream = stream.pipe(require('zlib').createUnzip())

            stream.on('data', d => chunks.push(d))
            stream.on('end', () => {
                let body = Buffer.concat(chunks)
                if (options.encoding && body.length) {        
                    try {
                        body = body.toString(options.encoding)
                        body = {
                            'application/json': str => JSON.parse(str), 
                            'application/x-www-form-urlencoded': str => parse(str)
                        }[res.headers['content-type']?.split('')?.[0]]?.(body) || body
                    } catch {
                        return resolve(new FetchError('Спарсить содержание не получилось', { path: url.toString(), body }, options.method))
                    }
                }

                if (res.statusCode < 400) return resolve(options.detailed ? {
                    body, res, statusMessage: res.statusMessage, status: res.statusCode, headers: res.headers
                } : body)
                else {
                    if (res.statusCode === 503 && body?.includes('cf-browser-verification')) 
                        return reject(new FetchError('Получена проверка браузера CloudFlare', { path: url.toString, body }, options.method))
                        
                    let errorMesasge
                    if (typeof body === 'object') errorMesasge = body.message || body.error
                    else errorMesasge = body?.slice?.(0, 100)
                    return reject(new FetchError(errorMesasge || res.statusMessage, { path: url.toString(), body }, options.method, res.statusCode))
                }

            })
        }).on('error', error => reject(error))

        delete options.headers['content-type']
        delete options.headers['content-length']

        if (options.signal) options.signal.onabort = () => req.abort() || reject(new FetchError('Аборт крч да !!', { path: url.toString() }, options.method))
        if (options.body instanceof Stream) return options.body.pipe(req)
        else if (options.body instanceof Multipart) {
            options.body.stream.pipe(req)
            options.body.pipe()
            return
        } else if (options.body) req.write(options.body)

        req.end()
    })
}

class FetchError extends Error {
    constructor(name, options, method = 'get', code) {
        if (typeof name === 'object') name = Object.values(name).find(value => typeof value === 'string') || 'hz('
        super(code && !name.startsWith?.(code.toString()) ? `${code}: ${name}` : name)

        for (let option in options) this[option] = options[option]
        this.method = method
        this.statusCode = code
        this.name = this[Symbol.toStringTag] = (method[0].toUpperCase() + method.slice(1).toLowerCase()) + 'Error'

        Error.captureStackTrace?.(this, this.constructor)
    }
}

class Multipart extends Array {
    constructor(boundary) {
        super()
        this.boundary = boundary
        this.stream = new Readable()
        this.stream._read = () => {}
    }

    pushReadable(value) {
        if (value instanceof Stream) return this.push(value) 
        else return this.push(
            new Readable({ 
                read() {
                    this.push(value)
                    this.push(null)
                }
            })
        )
    }

    add(entries) {
        const boundary = this.boundary
        for (const [ name, value ] of entries) {
            if (typeof value === 'object' && 'file' in value) {
                if (!value.name) value.name = 'file.txt'
                if (typeof value.file === 'string') value.file = Buffer.from(value.file)

                this.push(`--${boundary}\nContent-Disposition: form-data name="${name}" filename="${value.name}"\nContent-Type: ${value.type || 'application/octet-stream'}\r\n\r\n`) 
                this.pushReadable(value.file)
                this.push(`\r\n--${boundary}${entries[entries.length - 1][0] === name ? '--' : ''}\r\n`)
            } else this.push(`--${boundary}\nContent-Disposition: form-data name="${name}"\r\n\r\n${value}\r\n--${boundary}${entries[entries.length - 1][0] === name ? '--' : ''}\r\n`)
        }
        return this
    }

    pipe() {
        if (!this.length) return this.stream.push(null)

        const stream = this.shift()
        if (Buffer.isBuffer(stream) || typeof stream === 'string') {
            this.stream.push(stream)
            return this.pipe()
        }

        stream.on('data', this.stream.push.bind(this.stream))
        stream.on('end', this.pipe.bind(this))
    }
}