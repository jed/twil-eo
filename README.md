# Using Twilio, AWS, and Electric Objects to create an MMS-powered family photo frame.

A few months ago my partner and I welcomed a pudgy baby boy named Ko into our lives. Since then it's been amazing to see the small changes in him day by day, like when he discovered his hands, or learned how to smile. So I've found myself taking out my phone a lot more often, to capture as many of these moments as I can.

![Meet Ko, in classic onigiri form](images/ko.jpg)

And of course the demands from my parents for pictures of their new grandson have been fierce. Ordinarily I'd post things like this on Facebook, but having been on the receiving end of oversharing parents there for a while now, I wanted something a little less public. Sure, I could deal with Facebook's ever-changing twiddly permissions UI to make sure photos only went to my parents, but since we were already using iMessage to communicate, I decided to send them pictures there.

This was definitely the path of least resistance, but of course, the iMessage UI isn't really a great way to get a snapshot of someone's most recent pictures. So I decided to get creative, and **turn my Electric Objects Digital Art Display into a collaborative family photo frame**, so that my parents could see new pictures show up in their kitchen, in real time. I've used digital picture frames like [Ceiva](http://www.ceiva.com) in the past, and they're okay, but nothing matches the sleek finish of the Electric Objects display, or the ability to control how images are loaded and displayed.

![My Electric Objects family photo frame](images/frame.jpg)

Having seen a bunch of great SMS/MMS demos from [Ricky Robinett](https://twitter.com/rickyrobinett) at [BrooklynJS](http://brooklynjs.com), I figured Twilio would be an easy way to pull all of the photos out of our existing iMessage group and put them on the display. So I created an app that uses AWS to glue Twilio and Electric Objects together, and put [the source code on GitHub](https://github.com/jed/twil-eo). Here's how the whole thing works:

1. I created a new Twilio phone number and added it to the existing iMessage group my family uses to communicate.
2. Twilio sends all messages that arrive at this phone number to a Lambda function, via API Gateway.
3. The function copies any MMS images from Twilio to an S3 bucket, then pulls the most recent images from the bucket to compose a collage, which is then saved back to the bucket.
4. The function then tells Electric Objects to update the contents of my parent's display to the URL of the collage image.

From my phone to their display, the whole process takes about 15 seconds, a nice side effect of which is I get a backup of all the photos in an S3 bucket.

## Creating your own collaborative family photo frame

In this post, I'm going to show you how to create your own collaborative family photo frame. All you need to follow along is:

- [An Electric Objects Digital Art Display](https://www.amazon.com/dp/B00X98OMKE)
- [A Twilio account](https://www.twilio.com)
- [An Amazon Web Services account](https://aws.amazon.com)

Once you've got those sorted, you'll just need to:

1. understand how [the code](#code) works (optional, only if you're interested!),
2. [create a JSON file](#login) with your Electric Objects login information,
3. set up an [S3 bucket](#s3), [IAM role](#iam), [Lambda function](#lambda), and [API Gateway endpoint](#apigateway) on AWS,
4. set up a [Twilio phone number](#twilio), and [point it at your API Gateway endpoint](#webhook).

<a name="code"></a>
### Step 1: Understand how the code works

We'll step through the code here

<a name="login"></a>
### Step 2: Create a JSON file with your Electric Objects login information

Open your favorite text editor, and paste in the following JSON, replacing `where@jed.is` with the email address of your Electric Objects account and `timtam` with the password of your Electric Objects account.
```
{"email": "where@jed.is", "password": "timtam"}
```

Save this file as `eo-config.json`, anywhere on your computer where you can find it again.

<a name="s3"></a>
### Step 3a: Create an AWS S3 bucket.

This is where you'll store your EO1 account settings, the images coming in from Twilio, and the composited collage to be sent to the Electric Objects display.

1. From the top nav of the [AWS Console](https://console.aws.amazon.com), choose **Services**, then **All AWS Services**, then **S3**.
2. Click the **Create bucket** button.
3. For **Bucket Name**, specify the name of your project. Here, mine is `jed-family-frame`.
4. For **Region**, choose **US Standard**.
5. Click the **Create** button.
6. Click the **Upload** button.
7. Click the **Add Files** button.
8. Choose the `eo-config.json` file created above.
9. Click the **Start Upload** button.
10. Your bucket is ready.

<a name="iam"></a>
### Step 3b: Create an AWS IAM role.

This gives your Lambda function the permissions it needs to read from and write to the S3 bucket.

1. From the top nav of the [AWS Console](https://console.aws.amazon.com), choose **Services**, then **All AWS Services**, then **IAM**.
2. In the left sidebar, click the **Roles** button.
3. Click the **Create New Role** button.
4. For **Role Name**, specify the same name of your project as you did for the S3 bucket.
5. Click the **Select** button for **AWS Lambda**, under **AWS Service Roles**.
6. Select the checkboxes next to **AmazonS3FullAccess** and **CloudWatchLogsFullAccess**.
7. Click the **Next Step** button.
8. Click the **Create Role** button.
9. Your role is ready.

<a name="lambda"></a>
### Step 3c: Create an AWS Lambda function.

1. From the top nav of the [AWS Console](https://console.aws.amazon.com), choose **Services**, then **All AWS Services**, then **Lambda**.
2. Click the **Skip** button.
3. Click the **Next** button.
4. For **Name**, specify the same name of your project as you did for the S3 bucket.
5. For **Runtime**, choose **Node.js 4.3**.
6. For **Code entry type**, choose **Upload a .ZIP file**.
7. Click the **Upload** button and choose the `lambda.zip` file in your project directory.
8. For **Handler**, specify `index.handler`.
9. For **Role**, choose **Choose an existing role**.
10. For **Existing role**, choose the name of the role you created.
11. For **Memory (MB)**, specify `1024`.
12. For **Timeout**, specify `1` min.
13. For **VPC**, choose **No VPC**.
14. Click the **Next** button.
15. Click the **Create function** button.
16. Your lambda is ready.

<a name="apigateway"></a>
### Step 3d: Create an API Gateway endpoint

1. From the top nav of the [AWS Console](https://console.aws.amazon.com), choose **Services**, then **All AWS Services**, then **API Gateway**.
2. Click the **Get Started** button.
3. Click the **OK** button.
4. Select the **New API** radio button.
5. For **API name**, specify the same name of your project as you did for the S3 bucket.
6. Click the **Create API** button.
7. Click the **Actions...** button, and then choose **Create Method**.
8. From the select box, choose **POST** and then click the check button.
9. For **Integration type**, choose the **Lambda Function** radio button.
 10. For **Lambda Region**, choose the region for your function, which should be **us-east-1**.
 11. For **Lambda Function**, specify the first character name of your function (the same name as your project), and then choose the matching function name.
12. Click the **Save** button.
13. Click **OK**.
14. Click **Integration Request**.
	1. Under **Body Mapping Templates**, click the **Add mapping template** button,
	2. For **Content-Type**, specify `application/x-www-form-urlencoded`.
	3. Click the check button.
	4. Click the **Yes, secure this integration** button.
	4. For **application/x-www-form-urlencoded**, specify `$input.json('$')`.
	5. Click the **Save** button.
	6. Click **← Method Execution** button to go back.
15. Click **Integration Response**.
	1. Under **Body Mapping Templates**, click the **-** button next to **application/json**.
	2. Click the **Delete** button.
	3. click the **Add mapping template** button.
	4. For **Content-Type**, specify `application/xml`.
	5. Click the check button.
	6. For **application/xml**, specify `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`.
	7. Click the **Save** button.
	8. Click **← Method Execution** button to go back.
16. Click **Method Response**.
	1. Under **Response Models for 200**, click the **Add response model** button,
	2. For **Content-Type**, specify `application/xml`.
	3. For **Model**, choose `Empty`.
	4. Click the check button.
	5. Click the **X** button next to **application/json** to delete that content type.
17. Click the **Actions...** button and choose **Deploy API**.
18. For **Deployment stage**, choose **[New Stage]**.
19. For **Stage name**, specify `prod`.
20. Click the **Deploy** button.
21. Take note of the URL given at the top in **Invoke URL**. This is the URL you'll use for your Twilio webhook.
22. Your endpoint is ready.

<a name="twilio"></a>
### Step 4a: Buy a Twilio number

1. Open the [Twilio Console](https://www.twilio.com/console/phone-numbers/incoming) for phone numbers.
2. Click the **+** button.
3. For **COUNTRY**, choose **United States**.
4. For **CAPABILITIES**, select **MMS**.
5. Click the **Search** button.
6. Choose the number you want, and click the **Buy** button.
7. Click the **Buy This Number** button.
8. Click the **Setup number** button.

<a name="webhook"></a>
### Step 4b: Point your Twilio number at API Gateway

1. Under **Messaging**, for **A MESSAGE COMES IN**,
	1. Choose **Webhook**.
	2. Specify the invoke URL from your API Gateway endpoint. It should look like `https://**********.execute-api.us-east-1.amazonaws.com/prod`.
	3. Choose **HTTP POST**
2. Click the **Save** button.
3. Your phone number is ready.