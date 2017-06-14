'use strict'

const Koa = require('koa')
const app = new Koa()
const logger = require('koa-logger')
const router = require('koa-router')()
const koaBody = require('koa-body')({
	text: false,
	json: false,
})

const SERVER_TIMEOUT_MSEC = 10 * 60 * 1000

const LIST_PREFIX = 'FIELDS\tIP\tPORT\tPASSWORDED\tDEDICATED\tSERVERNAME\tPLAYERS\tMAXPLAYERS\tMAPNAME\tBRICKCOUNT\r\nSTART\r\n'
const LIST_SUFFIX = 'END\r\n'

const servers = []

router.get('/index.php', ctx => {
	const list = servers.map(server =>
		server.ip + '\t' +
		server.port + '\t' +
		(server.passworded ? '1' : '0') + '\t' +
		(server.dedicated ? '1' : '0') + '\t' +
		server.servername + '\t' +
		server.players + '\t' +
		server.maxplayers + '\t' +
		server.mapname + '\t' +
		server.brickcount + '\r\n').join('')
	ctx.body = LIST_PREFIX + list + LIST_SUFFIX
})

router.post('/postServer.php', koaBody, ctx => {
	let ip = ctx.ip
	let port = parseInt(ctx.request.body.Port, 10)
	let blid = parseInt(ctx.request.body.blid, 10)
	let passworded = ctx.request.body.Passworded === '1'
	let dedicated = ctx.request.body.Dedicated === '1'
	let servername = ctx.request.body.ServerName || ''
	let players = parseInt(ctx.request.body.Players, 10)
	let maxplayers = parseInt(ctx.request.body.MaxPlayers, 10)
	let mapname = ctx.request.body.Map || ''
	let brickcount = parseInt(ctx.request.body.BrickCount, 10)

	if (ip.startsWith('::ffff:')) ip = ip.slice(7)
	if (Number.isNaN(blid) || blid < 0) return ctx.body = 'FAIL invalid blid\r\n'
	if (Number.isNaN(port) || port < 1 || port > 65535) return ctx.body = 'FAIL invalid port\r\n'
	if (Number.isNaN(players) || players < 0) players = 0
	if (Number.isNaN(maxplayers) || maxplayers < 0) maxplayers = 0
	if (Number.isNaN(brickcount) || brickcount < 0) brickcount = 0

	// TODO: verify auth, get name (?)
	servername = `BLID ${blid}'s ${servername}`

	let server = servers.find(candidate =>
		candidate.ip === ip && candidate.port === candidate.port)

	if (server) {
		clearTimeout(server.timeout)
	} else {
		server = {
			ip,
			port,
		}
		servers.push(server)
	}

	server.timeout = setTimeout(serverTimeout, SERVER_TIMEOUT_MSEC, server)

	server.passworded = passworded
	server.dedicated = dedicated
	server.servername = servername
	server.players = players
	server.maxplayers = maxplayers
	server.mapname = mapname
	server.brickcount = brickcount

	ctx.body = ''
	
	// FAIL <text>
	// MMTOK <token>
	// MATCHMAKER <ip>
	// NOTE <text>
})

function serverTimeout(server) {
	const index = servers.indexOf(server)
	if (index === -1) return

	// swap-and-pop
	servers[index] = servers[servers.length - 1]
	servers.pop()
}

app.use(logger())
app.use(router.routes())
app.listen(80)
