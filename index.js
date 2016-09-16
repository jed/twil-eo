// # Using Twilio, AWS, and Electric Objects to create an MMS-powered family photo frame: understanding the code

// This is a walk-through of the AWS Lambda code used to build the MMS-powered family photo frame described in [this post](https://jed.github.io/twil-eo/intro.html). You don't need this to create your own frame, but it's always good to understand the code you'll be running.

// First, let's bring in some libraries to do the heavy lifting.

// We'll want to parse querystring payloads,
// make file system and process calls promise-friendly,
// fetch MMS image payloads from Twilio over HTTPS,
// store and retrieve images to and from S3,
// resize and compose images with ImageMagick,
// crop the most interesting square in an image,
// and finally, update our frame.
var qs = require('querystring')
var fs = require('mz/fs')
var child = require('mz/child_process')
var got = require('got')
var aws = require('aws-sdk')
var gm = require('gm')
var smartcrop = require('smartcrop-gm')
var eo = require('electric-objects')

// AWS Lambda ships with ImageMagick, so we'll use that.
var im = gm.subClass({imageMagick: true})

// We'll be reusing the same client for all S3 calls.
var s3 = new aws.S3()

// We'll store the name of our frame globally for easier access.
var frameName

// Now, let's define the layout of the collage.
var layout = []

// Since the aspect ratio of the EO1 frame is 9:16, we'll define our layout
// as a set of 16 squares in decreasing size from 6x6 to 1x1, and place
// them carefully to fill every pixel, as shown in the image below. Many
// thanks to [Nikki Sylianteng](https://twitter.com/nsylianteng) for helping
// me find a layout that's easy on the eyes!

// ![layout](images/layout.png)
layout[ 0] = {size: 6, left: 0, top:  0}

layout[ 1] = {size: 5, left: 4, top:  8}

layout[ 2] = {size: 4, left: 0, top:  6}
layout[ 3] = {size: 4, left: 0, top: 12}

layout[ 4] = {size: 3, left: 6, top:  0}
layout[ 5] = {size: 3, left: 6, top:  5}
layout[ 6] = {size: 3, left: 6, top: 13}

layout[ 7] = {size: 2, left: 7, top:  3}
layout[ 8] = {size: 2, left: 4, top:  6}
layout[ 9] = {size: 2, left: 0, top: 10}
layout[10] = {size: 2, left: 2, top: 10}
layout[11] = {size: 2, left: 4, top: 14}

layout[12] = {size: 1, left: 6, top:  3}
layout[13] = {size: 1, left: 6, top:  4}
layout[14] = {size: 1, left: 4, top: 13}
layout[15] = {size: 1, left: 5, top: 13}

// Now we export our handler, the function that's called whenever our
// AWS Lambda function is invoked. We'll get the frame name from the
// function name, handle all rejected promises globally to simplify
// our code, and then pass the message to our `onmessage` listener.
exports.handler = function(message, context) {
  frameName = context.functionName

  process.once('unhandledRejection', context.fail)

  onmessage(message).then(context.succeed, context.fail)
}

// When a message arrives, we'll parse it into images. If no images exist,
// we'll return early, otherwise we'll handle each image and then create
// the collage.
function onmessage(message) {
  var images = parse(message)

  if (images.length < 1) return

  return Promise.all(images.map(onimage)).then(onimages)
}

// Let's pull the images out of the payload from the Twilio webhook.
// Identifiers are created by subtracting the timestamp and sequence number
// from an arbitrarily large integer, so that newer images will sort
// lexicographically before older images, allowing us to query S3 for only
// the most recent ones, without iterating through the whole bucket.
function parse(message) {
  var data = qs.parse(message)
  var now = Date.now()

  return Array.from({length: data.NumMedia}).map((n, seq) => {
    var url = data[`MediaUrl${seq}`]
    var contentType = data[`MediaContentType${seq}`]
    var id = (Number.MAX_SAFE_INTEGER - now - seq).toString(36)
    var suffix = contentType.split('/').pop()
    var path = `images/${id}.${suffix}`
    var message = data.Body

    return {url, contentType, path, message}
  })
}

// For each incoming image, we'll need to fetch it from Twilio, crop
// it to a square, and then upload it to our S3 bucket.
function onimage(image) {
  return Promise.resolve(image)
    .then(fetch)
    .then(crop)
    .then(upload)
}

// We'll pull the image as a buffer from its Twilio URL.
function fetch(image) {
  return got.get(image.url, {encoding: null}).then(res => {
    return Object.assign(image, {body: res.body})
  })
}

// We'll crop the most interesting square out of the image, resize it
// to 1080 pixels (the width of the display), and update the image body.
function crop(image) {
  var size = {width: 1080, height: 1080}

  return smartcrop.crop(image.body, size).then(data => {
    var w = data.topCrop.width
    var h = data.topCrop.height
    var x = data.topCrop.x
    var y = data.topCrop.y

    return new Promise((resolve, reject) => {
      im(image.body).crop(w, h, x, y).toBuffer((err, body) => {
        err ? reject(err) : resolve(Object.assign(image, {body}))
      })
    })
  })
}

// We'll upload the image to S3.
function upload(image) {
  var params = {
    Bucket: frameName,
    Key: image.path,
    Body: image.body,
    ContentType: image.contentType,
    Metadata: {message: image.message}
  }

  return s3.putObject(params).promise()
}

// Once all of the inbound images are processed, we'll need to list and
// then download the latest ones, compose them into the collage, publish
// it to S3, and then tell the frame that the collage has been updated.
function onimages() {
  return Promise.resolve()
    .then(list)
    .then(download)
    .then(compose)
    .then(publish)
    .then(update)
}

// Let's list the keys of the 16 most recent images in our S3 bucket.
function list() {
  var listObjects = s3.listObjectsV2({
    Bucket: frameName,
    Delimiter: '/',
    MaxKeys: 16,
    Prefix: 'images/',
    StartAfter: 'images/'
  }).promise()

  return listObjects.then(res => res.Contents.map(item => item.Key))
}

// Now let's download all the images we need to `/tmp/images`, creating
// the directory if it doesn't already exist.
function download(keys) {
  return fs.mkdir('/tmp/images').catch(() => {}).then(() => {
    var downloads = keys.map(Key => {
      return new Promise(resolve => {
        var getObject = s3.getObject({Bucket: frameName, Key})
        var rs = getObject.createReadStream()
        var ws = fs.createWriteStream(`/tmp/${Key}`)
        rs.pipe(ws)
        ws.on('finish', resolve)
      })
    })

    return Promise.all(downloads).then(() => keys)
  })
}

// Let's compose the collage with ImageMagick, and then save it to `/tmp`.
// We'll use a black background by default for missing images, and set
// the dimensions to 1080p portrait to match those of the frame.
function compose(keys) {
  var cmd = 'convert -size 1080x1920 xc:black'

  keys.forEach((key, i) => {
    var xy = `${layout[i].left * 120},${layout[i].top * 120}`
    var wh = `${layout[i].size * 120},${layout[i].size * 120}`
    cmd += ` -draw "image Over ${xy} ${wh} '/tmp/${key}'"`
  })

  cmd += ' /tmp/collage.jpeg'

  return child.exec(cmd)
}

// Once the collage is done, we'll publish it on S3 so that our frame
// can reach it.
function publish() {
  var params = {
    Bucket: frameName,
    Key: 'collage.jpeg',
    Body: fs.createReadStream('/tmp/collage.jpeg'),
    ContentType: 'image/jpeg',
    ACL: 'public-read'
  }

  return new Promise((resolve, reject) => {
    var cb = err => err ? reject(err) : resolve()

    s3.upload(params, cb)
  })
}

// To update our frame, we'll need to pull the credentials from S3
// and use them to log in to the Electric Objects website, and use
// their `set_url` page to point the frame to the collage URL.
function update() {
  var url = `http://s3.amazonaws.com/${frameName}/collage.jpeg`
  var params = {Bucket: frameName, Key: 'eo-config.json'}
  var getObject = s3.getObject(params).promise()

  return getObject.then(res => {
    var account = JSON.parse(res.Body.toString('utf8'))
    var client = eo(account.email, account.password)

    return client.setUrl(url)
  })
}
