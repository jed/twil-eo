# Using Twilio, AWS, and Electric Objects to create an MMS-powered family photo frame: setting up Twilio and AWS

The following are instructions for building the MMS-powered family photo frame described in [this post](https://jed.github.io/twil-eo/intro.html).

All in all this setup should take you about ten minutes. Setup is divided into four parts:

1. Download [the Lambda code](#lambda) and [Electric Objects login information](#login),
2. set up an [S3 bucket](#s3), [IAM role](#iam), [Lambda function](#lambda), and [API Gateway endpoint](#apigateway) on AWS,
3. set up a [Twilio phone number](#twilio), and [point it at your API Gateway endpoint](#webhook),
4. [send an MMS](#test) to your number to test that it works.

<a name="lambda"></a>
### Step 1a: Download the lambda code

Download [the Lambda code](https://raw.githubusercontent.com/jed/twil-eo/master/lambda.zip) from GitHub, and save it anywhere on your computer where you can find it again.

<a name="login"></a>
### Step 1b: Download and edit the Electric Objects login JSON file.

1. Download [Electric Objects login JSON file](https://raw.githubusercontent.com/jed/twil-eo/master/eo-config.json) from GitHub, and save it in the same location as above.
2. Open this file in your favorite text editor, replace `YOUR-ELECTRIC-OBJECTS-EMAIL-ADDRESS` and `YOUR-ELECTRIC-OBJECTS-PASSWORD` with your Electric Objects email address and password, and then save your changes.

<a name="s3"></a>
### Step 2a: Create an AWS S3 bucket.

This is where you'll store your EO1 account settings, the images coming in from Twilio, and the composited collage to be sent to the Electric Objects display.

1. From the top nav of the [AWS Console](https://console.aws.amazon.com), choose **Services**, then **All AWS Services**, then **S3**.
2. Click the **Create bucket** button.
3. For **Bucket Name**, specify the name of your project. Here, mine is `jed-family-frame`.
4. For **Region**, choose **US Standard**.
5. Click the **Create** button.
6. Click the **Upload** button.
7. Click the **Add Files** button.
8. Choose the `eo-config.json` file downloaded in [step 1b](#login).
9. Click the **Start Upload** button.
10. Your bucket is ready.

<a name="iam"></a>
### Step 2b: Create an AWS IAM role.

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
### Step 2c: Create an AWS Lambda function.

1. From the top nav of the [AWS Console](https://console.aws.amazon.com), choose **Services**, then **All AWS Services**, then **Lambda**.
2. Click the **Skip** button.
3. Click the **Next** button.
4. For **Name**, specify the same name of your project as you did for the S3 bucket.
5. For **Runtime**, choose **Node.js 4.3**.
6. For **Code entry type**, choose **Upload a .ZIP file**.
7. Click the **Upload** button and choose the `lambda.zip` file downloaded in [step 1a](#lambda).
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
### Step 2d: Create an AWS API Gateway endpoint

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
### Step 3a: Buy a Twilio number

1. Open the [Twilio Console](https://www.twilio.com/console/phone-numbers/incoming) for phone numbers.
2. Click the **+** button.
3. For **COUNTRY**, choose **United States**.
4. For **CAPABILITIES**, select **MMS**.
5. Click the **Search** button.
6. Choose the number you want, and click the **Buy** button.
7. Click the **Buy This Number** button.
8. Click the **Setup number** button.

<a name="webhook"></a>
### Step 3b: Point your Twilio number at API Gateway

1. Under **Messaging**, for **A MESSAGE COMES IN**,
    1. Choose **Webhook**.
    2. Specify the invoke URL from your API Gateway endpoint. It should look like `https://**********.execute-api.us-east-1.amazonaws.com/prod`.
    3. Choose **HTTP POST**
2. Click the **Save** button.
3. Your phone number is ready.

<a name="test"></a>
### Step 4: Test your setup

Once you've completed the setup, take out your phone and send a photo to your Twilio phone number. Your frame should be updated with the new photo within about 15 seconds, but if it isn't:

1. Check the [programmable SMS logs](https://www.twilio.com/console/sms/logs) in your Twilio console to see that an appropriate response was returned from API Gateway.
2. Check the [AWS CloudWatch logs](https://console.aws.amazon.com/cloudwatch/home) for your Lambda function to see if the function terminated successfully.

Also, to check whether your collage has been updated without checking your Electric Objects display directly, just access the collage image from your S3 bucket, in the [AWS S3 console](https://console.aws.amazon.com/s3/home).