import { fastifyMultipart } from '@fastify/multipart'
import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { basename, extname, resolve } from 'node:path'
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import { prisma } from '../lib/prisma'

const pump = promisify(pipeline)

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25, // 25mb
    },
  })

  app.post('/videos', async (request, reply) => {
    const data = await request.file()

    if (!data) {
      return reply.status(400).send({ error: 'Missing file input.' })
    }

    const extension = extname(data.filename)

    if (extension !== '.mp3') {
      return reply
        .status(400)
        .send({ error: 'Invalid input type, please upload a MP3.' })
    }

    const fileBaseName = basename(data.filename, extension)
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`
    const destination = resolve(__dirname, '..', '..', 'tmp', fileUploadName)

    await pump(data.file, createWriteStream(destination))

    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: destination,
      },
    })

    return reply.send({
      video,
    })
  })
}
