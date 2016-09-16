var qs = require('querystring')
var index = require('./index')

var message = qs.stringify({
  NumMedia: 1,
  Body: 'Test',
  MediaUrl0: 'https://avatars0.githubusercontent.com/u/4433',
  MediaContentType0: 'image/jpeg'
})

var context = {
  succeed: msg => { console.log(msg) },
  fail: err => { throw err },
  functionName: 'twileo'
}

index.handler(message, context)
