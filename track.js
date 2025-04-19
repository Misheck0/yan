import puppeteer from 'puppeteer';

async function trackParcel(orderID) {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    let trackingData = [];

    try {
        const page = await browser.newPage();

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
                    console.error('Error parsing JSON:', error);
                }
            }
        });

        await page.goto(`https://www.fycargo.com/index/search?no=${orderID}`, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await new Promise(resolve => setTimeout(resolve, 5000));

        process.stdout.write(JSON.stringify(
            trackingData.length > 0
                ? { status: 'success', tracking_info: trackingData }
                : { status: 'error', message: 'Failed to retrieve tracking data.' }
        ));

    } catch (error) {
        console.error('Error:', error);
        process.stdout.write(JSON.stringify({
            status: 'error',
            message: 'An error occurred during tracking.'
        }));
    } finally {
        await browser.close();
    }
}

if (process.argv[1].endsWith('track.js')) {
    const orderID = process.argv[2];
    if (!orderID) {
        console.error('Please provide an order ID');
        process.exit(1);
    }
    trackParcel(orderID);
}
