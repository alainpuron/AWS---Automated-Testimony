const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const body = new URLSearchParams(event.body);
  const formData = Object.fromEntries(body);
  console.log('Parsed form data:', formData);

  if (formData.authorization !== 'on') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Authorization not granted' }) };
  }

  const bills = formData.bills.split(',').map(b => b.trim());
  console.log('Bills to process:', bills);

  const rawPosition = (formData['Position'] || '').toLowerCase().trim();
  const position = rawPosition.includes('support') ? 'For' :
                   rawPosition.includes('oppose') ? 'Against' :
                   rawPosition.includes('neutral') ? 'Neutral' : 'For';


  const testify = (formData['How do you wish to testify?'] || '').trim();
  
  
  let chromium, playwright;
  try {
    chromium = require('@sparticuz/chromium');
    playwright = require('playwright-core').chromium;
  } catch (e) {
    console.error('Failed to load browser dependencies:', e);
    return { statusCode: 500, body: JSON.stringify({ error: 'Browser dependencies not found: ' + e.message }) };
  }

  let browser;
  let screenshotKey;
  const results = [];

  try {
    browser = await playwright.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    for (const billNumber of bills) {
      console.log(`Processing bill: ${billNumber}`);

      try {
        // STEP 1: Search for bill
        await page.goto('https://sites.coleg.gov/public-testimony/sign-up-to-testify/step-1', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        await page.waitForTimeout(5000);
        console.log('On Step 1');

        const searchSelectors = [
          'input[type="search"]',
          'input[placeholder*="search" i]',
          'input[placeholder*="bill" i]',
          'input[aria-label*="search" i]',
          'input[type="text"]'
        ];

        let searchFilled = false;
        for (const selector of searchSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 3000 });
            await page.fill(selector, billNumber);
            searchFilled = true;
            console.log(`Found search box with selector: ${selector}`);
            break;
          } catch (e) {
            console.log(`Selector ${selector} not found, trying next...`);
          }
        }

        if (!searchFilled) throw new Error('Could not find search box on Step 1');

        await page.click('button:has-text("Search")');

        // Click Select link (it's an <a> tag, not a button)
        let selectClicked = false;
        for (let i = 0; i < 10; i++) {
          await page.waitForTimeout(2000);
          selectClicked = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const selectLink = links.find(a => a.textContent.trim().startsWith('Select'));
            if (selectLink) { selectLink.click(); return true; }
            return false;
          });
          if (selectClicked) {
            console.log(`Clicked Select link on attempt ${i + 1}`);
            break;
          }
          console.log(`Select link not found yet, attempt ${i + 1}/10`);
        }

        if (!selectClicked) throw new Error('Could not find Select link after 10 attempts');
        await page.waitForTimeout(2000);

        // Handle Keep and Continue if it appears
        try {
          await page.waitForSelector('button:has-text("Keep and Continue")', { timeout: 5000 });
          await page.click('button:has-text("Keep and Continue")');
          console.log('Clicked Keep and Continue');
        } catch (e) {
          console.log('No Keep and Continue, proceeding');
        }

        // STEP 2: Testimony options
        await page.waitForURL('**/step-2', { timeout: 15000 });
        await page.waitForTimeout(2000);
        console.log('On Step 2');

        // await page.getByLabel('Remotely via Zoom').check().catch(async () => {
        //   await page.getByText('Remotely via Zoom', { exact: false }).click();
        // });
       await page
        .locator('label', { hasText: testify })
        .click();

       

    

        // Position
        await page.getByRole('combobox').click();
        await page.getByRole('option', { name: position }).click();

        // Representing Self
        await page.getByText('Self', { exact: false }).click();

        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const next = buttons.find(b => b.textContent.trim().includes('Next') || b.textContent.trim().includes('Continue'));
          if (next) next.click();
        });

        // STEP 3: Personal info
        await page.waitForURL('**/step-3', { timeout: 15000 });
        await page.waitForTimeout(2000);
        console.log('On Step 3');

        const data = {
          firstName: formData['First Name'],
          lastName: formData['Last Name'],
          email: formData['Email'],
          phone: formData['Phone'],
          street: formData['Street Address'],
          city: formData['City'],
          zip: formData['Zip Code']
        };

        await page.waitForSelector('input[autocomplete="given-name"]', { timeout: 10000 });

        const firstNameInput = await page.$('input[autocomplete="given-name"]');
        await firstNameInput.type(data.firstName, { delay: 50 });

        const lastNameInput = await page.$('input[autocomplete="family-name"]');
        await lastNameInput.type(data.lastName, { delay: 50 });

        const emailInput = await page.$('input[autocomplete="email"]');
        await emailInput.type(data.email, { delay: 50 });

        const phoneInput = await page.$('input[autocomplete="tel-national"]');
        await phoneInput.type(data.phone, { delay: 50 });

        await page.getByLabel('No - English').check().catch(async () => {
          await page.getByText('No - English', { exact: false }).click();
        });

        const addressInput = await page.$('input[autocomplete="address-line1"]');
        await addressInput.type(data.street, { delay: 50 });

        const cityInput = await page.$('input[autocomplete="address-level2"]');
        await cityInput.type(data.city, { delay: 50 });

        await page.getByRole('combobox', { name: /State/i }).click();
        await page.waitForTimeout(500);
        await page.getByRole('option', { name: 'Colorado' }).click();
        await page.waitForTimeout(500);

        const zipcodeInput = await page.$('input[autocomplete="postal-code"]');
        await zipcodeInput.type(data.zip, { delay: 50 });

        await page.waitForTimeout(500);

        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const next = buttons.find(b => b.textContent.trim().includes('Next') || b.textContent.trim().includes('Continue'));
          if (next) next.click();
        });

        // STEP 4: Review and submit
        await page.waitForURL('**/step-4', { timeout: 15000 });
        await page.waitForTimeout(2000);
        console.log('On Step 4');

        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const submit = buttons.find(b => b.textContent.trim().includes('Submit'));
          if (submit) submit.click();
        });

        await page.waitForTimeout(5000);

        // Capture confirmation screenshot
        const confirmShot = await page.screenshot({ fullPage: true });
        screenshotKey = await uploadScreenshot(confirmShot, `${data.lastName}-${billNumber}`, 'CONFIRM-');

        console.log(`Success for ${billNumber}`);
        results.push({ bill: billNumber, status: 'success' });

      } catch (billError) {
        console.error(`Error on bill ${billNumber}:`, billError.message);

        try {
          const errShot = await page.screenshot({ fullPage: true });
          await uploadScreenshot(errShot, `error-${billNumber}`, 'ERR-');
        } catch (e) {
          console.log('Could not capture error screenshot');
        }

        results.push({ bill: billNumber, status: 'failed', error: billError.message });
      }
    }

    await browser.close();

    // Generate presigned URL for screenshot
   const presignedUrl = screenshotKey 
  ? `https://${process.env.SCREENSHOT_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${screenshotKey}`
  : null;

    const billSummary = results.map(r =>
      `• ${r.bill}: ${r.status === 'success' ? '✅ Submitted' : '❌ Failed' + (r.error ? ' - ' + r.error : '')}`
    ).join('\n');

    // Admin email
    await sendEmail(
      process.env.NOTIFICATION_EMAIL,
      `✅ Testimony Submitted - ${formData['First Name']} ${formData['Last Name']}`,
      `Testimony submitted for ${formData['First Name']} ${formData['Last Name']}.

Bills:
${billSummary}

Email: ${formData['Email']}
Phone: ${formData['Phone']}
Address: ${formData['Street Address']}, ${formData['City']}, CO ${formData['Zip Code']}

Confirmation screenshot (valid 7 days):
${presignedUrl || 'Not available'}`
    );

    // User confirmation email
    await sendEmail(
      formData['Email'],
      `Your testimony has been submitted`,
      `Hi ${formData['First Name']},

We have successfully submitted your testimony to the Colorado Legislature on your behalf.

Bills submitted:
${billSummary}

View your submission confirmation (link valid 7 days):
${presignedUrl || 'Not available'}

Thank you for participating in the legislative process.

Rocky Mountain Gun Owners`
    );

    return { statusCode: 200, body: JSON.stringify({ success: true, results }) };

  } catch (error) {
    console.error('Fatal error:', error.message);

    if (browser) {
      try {
        const pages = browser.contexts()[0].pages();
        if (pages.length > 0) {
          const screenshot = await pages[0].screenshot({ fullPage: true });
          screenshotKey = await uploadScreenshot(screenshot, formData['Last Name'] || 'unknown', 'FATAL-');
        }
        await browser.close();
      } catch (e) {
        console.error('Screenshot capture failed:', e.message);
      }
    }

    await sendEmail(
      process.env.NOTIFICATION_EMAIL,
      `❌ Testimony FAILED - ${formData['First Name']} ${formData['Last Name']}`,
      `Testimony automation FAILED for ${formData['First Name']} ${formData['Last Name']}.

Email: ${formData['Email']}
Error: ${error.message}

Screenshot: ${screenshotKey || 'Not captured'}`
    );

    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

async function uploadScreenshot(buffer, name, prefix) {
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  const key = `testimony/${prefix}${Date.now()}-${name}.png`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.SCREENSHOT_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'image/png',
  }));
  console.log('Screenshot uploaded:', key);
  return key;
}


async function sendEmail(to, subject, body) {
  const ses = new SESClient({ region: process.env.AWS_REGION });
  await ses.send(new SendEmailCommand({
    Source: process.env.NOTIFICATION_EMAIL,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Text: { Data: body } }
    }
  }));
  console.log('Email sent to:', to);
}