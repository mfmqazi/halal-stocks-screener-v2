import express from 'express';
import yahooFinanceService from '../services/yahooFinanceService.js';

const router = express.Router();

// GET /api/test/stock/:symbol - Test Yahoo Finance API directly (no database)
router.get('/stock/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;

        console.log(`Testing Yahoo Finance API for ${symbol}...`);
        const stockData = await yahooFinanceService.getStockData(symbol.toUpperCase());

        if (!stockData) {
            return res.status(404).json({ error: 'Stock not found or API error' });
        }

        const screenedData = yahooFinanceService.screenStock(stockData);

        res.json({
            success: true,
            message: 'Yahoo Finance API is working!',
            data: screenedData
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/test/health - Simple health check
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Test endpoint is working',
        timestamp: new Date().toISOString()
    });
});

export default router;
