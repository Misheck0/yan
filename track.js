import puppeteer from 'puppeteer';

async function trackParcel(orderID) {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: puppeteer.executablePath(), // 👈 Add this line for Heroku
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

        // Go to the tracking page
        await page.goto(`https://www.fycargo.com/index/search?no=${orderID}`, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // Wait for any async tracking data to load
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Send result to stdout for Laravel to read
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
