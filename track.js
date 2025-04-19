import puppeteer from 'puppeteer';
import fs from 'fs';

async function trackParcel(orderID) {
    const herokuChromePath = '/app/.cache/puppeteer/chrome/linux-135.0.7049.84/chrome-linux64/chrome';

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: fs.existsSync(herokuChromePath)
            ? herokuChromePath
            : puppeteer.executablePath(),
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    });

    let trackingData = [];

    try {
        const page = await browser.newPage();

        // Capture network response
        page.on('response', async (response) => {
            const url = response.url();
            const headers = response.headers();

            if (
                url.includes('/index/search?orderID=') &&
                headers['content-type']?.includes('application/json')
            ) {
                try {
                    const json = await response.json();
                    if (json.isOk === '1' && json.content) {
                        trackingData = json.content.map(item => ({
                            time: item.time,
                            description: item.description
                        }));
                    }
                } catch (error) {
                    console.error('Error parsing response JSON:', error);
                }
            }
        });

        await page.goto(`https://www.fycargo.com/index/search?no=${orderID}`, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await new Promise(resolve => setTimeout(resolve, 5000));

        if (trackingData.length > 0) {
            process.stdout.write(JSON.stringify({
                status: 'success',
                tracking_info: trackingData
            }));
        } else {
            process.stdout.write(JSON.stringify({
                status: 'error',
                message: 'Failed to retrieve tracking data.'
            }));
        }
    } catch (error) {
        console.error('Error:', error);
        process.stdout.write(JSON.stringify({
            status: 'error',
            message: 'An error occurred while processing the tracking request.'
        }));
    } finally {
        await browser.close();
    }
}

// If run directly
if (process.argv[1].endsWith('track.js')) {
    const orderID = process.argv[2];
    if (!orderID) {
        console.error('Please provide an order ID');
        process.exit(1);
    }
    trackParcel(orderID);
}
// If imported as a module