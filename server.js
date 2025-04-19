import express from 'express';
import { exec } from 'child_process';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/track/:orderID', (req, res) => {
    const orderID = req.params.orderID;
    exec(`node track.js ${orderID}`, (error, stdout, stderr) => {
        if (error) {
            console.error('Execution error:', error);
            return res.status(500).json({ status: 'error', message: 'Internal server error' });
        }

        try {
            const result = JSON.parse(stdout);
            return res.json(result);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return res.status(500).json({ status: 'error', message: 'Failed to parse output' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
