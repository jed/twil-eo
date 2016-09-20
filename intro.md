# Using Twilio, AWS, and Electric Objects to create an MMS-powered family photo frame.

A few months ago my partner and I welcomed a pudgy baby boy named Ko into our lives. Since then it's been amazing to see the small changes in him day by day, like when he discovered his hands, or learned how to smile. So I've found myself taking out my phone a lot more often, to capture as many of these moments as I can.

![Meet Ko, in classic onigiri form](images/ko.jpg)

And of course the demands from my parents for pictures of their new grandson have been fierce. Ordinarily I'd post things like this on Facebook, but having been on the receiving end of oversharing parents there for a while now, I wanted something a little less public. Sure, I could deal with Facebook's ever-changing twiddly permissions UI to make sure photos only went to my parents, but since we were already using iMessage to communicate, I decided to send them pictures there.

This was definitely the path of least resistance, but of course, the iMessage UI isn't really a great way to get a snapshot of someone's most recent pictures. So I decided to get creative, and **turn my Electric Objects Digital Art Display into a collaborative family photo frame**, so that my parents could see new pictures show up in their kitchen, in real time. I've used digital picture frames like [Ceiva](http://www.ceiva.com) in the past, and they're okay, but nothing matches the sleek finish of the Electric Objects display, or the ability to control how images are loaded and displayed. And if you get bored of family photos you can always use it to show [Jenn Schiffer](https://twitter.com/jennschiffer)'s [excellent pixel art](https://www.electricobjects.com/collections/149/pixelbabes-emotions-by-jenn-schiffer) or follow [Tom MacWright](https://twitter.com/tmcw)'s lead and [make your own animated art](http://www.macwright.org/2016/05/31/the-electric-objects-one.html).

![My Electric Objects family photo frame](images/frame.jpg)

Having seen a bunch of great SMS/MMS demos from [Ricky Robinett](https://twitter.com/rickyrobinett) at [BrooklynJS](http://brooklynjs.com), I figured Twilio would be an easy way to pull all of the photos out of our existing iMessage group and put them on the display. So I created an app that uses AWS to glue Twilio and Electric Objects together, and put [the source code on GitHub](https://github.com/jed/twil-eo). Here's how the whole thing works:

1. I created a new Twilio phone number and added it to the existing iMessage group my family uses to communicate.
2. Twilio sends all messages that arrive at this phone number to a Lambda function, via API Gateway.
3. The function copies any MMS images from Twilio to an S3 bucket, then pulls the most recent images from the bucket to compose a collage, which is then saved back to the bucket.
4. The function then tells Electric Objects to update the contents of my parent's display to the URL of the collage image.

From my phone to their display, the whole process takes about 15 seconds, a nice side effect of which is I get a backup of all the photos in an S3 bucket.

## Creating your own collaborative family photo frame

In this post, I'm going to show you how to create your own collaborative family photo frame. All you need to follow along is:

- [An Electric Objects Digital Art Display](https://www.amazon.com/dp/B00X98OMKE?tag=jedschmidt-20). The price of the frame [fluctuates quite a bit on Amazon](http://camelcamelcamel.com/Electric-Objects-Digital-Display-Black/product/B00X98OMKE), but can often be found around $250.
- [A Twilio account](https://www.twilio.com) that's been upgraded with credit.
- [An Amazon Web Services account](https://aws.amazon.com).

Once you've got those sorted, now you'll just need to:

1. walk through [the source code](https://jed.github.io/twil-eo/index.html) (optional, only if you're interested!), and then
2. follow [the setup instructions](https://jed.github.io/twil-eo/setup.html) for AWS and Twilio.

If you're stuck trying to get your frame set up, please feel free to ask me for help in the comments!