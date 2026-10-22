const pool = require('./config/database')
const aiController = require('./controllers/aiController')

async function testTextFileAi() {
  const [users] = await pool.query('SELECT * FROM users WHERE id = 1')
  const user = users[0]

  const req = {
    params: { fileId: 1 },
    body: { question: 'what are the objectives?' },
    user,
    ip: '127.0.0.1'
  }

  let resultData = null
  let statusCode = 200
  const res = {
    status: (code) => { statusCode = code; return res },
    json: (data) => { resultData = data; return res }
  }

  await aiController.askDocumentQuestion(req, res)
  console.log('AI Q&A on text file:', resultData)

  await aiController.summarizeDocument(req, res)
  console.log('AI Summary on text file:', resultData)

  process.exit(0)
}

testTextFileAi().catch(err => {
  console.error(err)
  process.exit(1)
})
