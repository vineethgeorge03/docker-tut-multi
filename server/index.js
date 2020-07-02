const keys = require('./keys')

// EXPRESS APP SETUP
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(bodyParser.json())

// POSTgres client setup
const {Pool} = require('pg')
const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
})

pgClient.on('connect', () => {
		pgClient.query('CREATE TABLE IF NOT EXISTS values(number INT)')
		.then(() =>  console.log('CONNECTED TO POSTGRES'))
		.catch((err) => console.log('CONNECTION ERROR ',err))
})
// REDIS CLIENT SETUP

const redis = require('redis')
const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
})
const redisPublisher = redisClient.duplicate()

// Express route handlers

app.get('/', (req, res) => {
  res.send('Hi')
})

app.get('/values/all', async(req, res) => {
 const values = await pgClient.query('SELECT * from values')
										  .catch((er) => {
														console.log('ERRORS is', er);
														return {}
												})
  res.send(values.rows)
})

app.get('/values/current', async(req,res) => {
  redisClient.hgetall('values', (err, values) => {
    res.send(values)
  })
})

app.post('/value', async(req,res) => {
  const index = req.body.index
  if(parseInt(index) > 40) {
    return res.status(422).send('Index too high')
  }
  redisClient.hset('values', index, 'Nothing Yet')
  redisPublisher.publish('insert', index)
  pgClient.query('INSERT INTO VALUES(number) VALUES($1)', [index])
  res.send({working: true})
})

app.listen(5000, err => {
  console.log('listening')
})
