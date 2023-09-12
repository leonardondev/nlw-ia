import { fastify } from 'fastify'

const app = fastify()

app.get('/', () => {
  return 'API online'
})

app
  .listen({
    port: 3333,
    host: '0.0.0.0',
  })
  .then(() => {
    console.log('HTTP Server Running!')
  })
