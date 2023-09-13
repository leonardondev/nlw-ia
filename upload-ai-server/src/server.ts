import { fastify } from 'fastify'
import { getAllPromptsRoute } from './routes/get-all-prompts'
import { uploadVideoRoute } from './routes/upload-video'

const app = fastify()

app.register(getAllPromptsRoute)
app.register(uploadVideoRoute)

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
